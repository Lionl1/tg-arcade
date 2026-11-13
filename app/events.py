"""Турниры и дуэли: общий уровень (зерно = id события), карточка в чате, итоги по таймеру."""

import asyncio
import logging
import os
import re
import time
from html import escape

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, ReplyParameters

from .catalog import Catalog, Game
from .db import Event, Store
from .links import Links

log = logging.getLogger("arcade.events")

# серверные ограничения (умолчания для чатов — в app/prefs.py, меняются через /settings)
TOUR_MIN = int(os.getenv("TOUR_MIN_MINUTES", "5"))
TOUR_MAX = int(os.getenv("TOUR_MAX_MINUTES", str(7 * 24 * 60)))
GRACE = int(os.getenv("EVENT_GRACE_SECONDS", "90"))  # сек после финиша, чтобы доиграть начатую партию
MAX_ACTIVE = int(os.getenv("MAX_ACTIVE_EVENTS", "5"))  # одновременно в одном чате
EDIT_EVERY = 4.0  # не чаще, чем раз в N секунд правим карточку
MEDALS = ["🥇", "🥈", "🥉"]

DUR_RE = re.compile(r"^(\d{1,4})\s*(m|м|min|мин|h|ч|час|часа|часов|d|д|дн|день|дня|дней)?$", re.I)


def parse_duration(token: str) -> int | None:
    """'30м' / '2ч' / '1d' / '45' → минуты (голое число — минуты)."""
    m = DUR_RE.match(token.strip())
    if not m:
        return None
    n, unit = int(m.group(1)), (m.group(2) or "m").lower()
    if unit[0] in "hч":
        n *= 60
    elif unit[0] in "dд":
        n *= 24 * 60
    return n


def fmt_left(sec: float) -> str:
    sec = max(0, int(sec))
    d, h, m = sec // 86400, sec % 86400 // 3600, sec % 3600 // 60
    if d:
        return f"{d} д {h} ч" if h else f"{d} д"
    if h:
        return f"{h} ч {m} мин" if m else f"{h} ч"
    return f"{max(m, 1)} мин"


class EventError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class Events:
    def __init__(self, store: Store, catalog: Catalog, links: Links | None = None, bot: Bot | None = None,
                 progress=None):
        self.store, self.catalog, self.links, self.bot = store, catalog, links, bot
        self.progress = progress  # app.progress.Progress — ачивки за победы
        self._last_edit: dict[int, float] = {}
        self._pending: set[int] = set()
        self._tasks: set[asyncio.Task] = set()

    # ---------- создание ----------

    async def _check_limit(self, chat_id: int) -> None:
        if len(await self.store.active_events(chat_id)) >= MAX_ACTIVE:
            raise EventError(429, f"В чате уже {MAX_ACTIVE} активных турниров и дуэлей — дождитесь итогов. /events")

    async def chat_prefs(self, chat_id: int) -> dict:
        from .prefs import CHAT, defaults
        return await self.progress.prefs.chat(chat_id) if self.progress else defaults(CHAT)

    async def create_tournament(self, chat_id: int, game: Game, minutes: int | None, user_id: int, name: str) -> Event:
        cp = await self.chat_prefs(chat_id)
        if not cp["tours"]:
            raise EventError(403, "Турниры в этом чате выключены админами (/settings)")
        await self._check_limit(chat_id)
        minutes = max(TOUR_MIN, min(TOUR_MAX, minutes or cp["tour_minutes"]))
        ev = await self.store.create_event("tour", chat_id, game.id, user_id, name, int(time.time()) + minutes * 60)
        await self._post(ev, pin=cp["pin"])
        return ev

    async def create_duel(self, chat_id: int, game: Game, user_id: int, name: str,
                          opponent_id: int | None = None, opponent_name: str | None = None) -> Event:
        if opponent_id == user_id:
            raise EventError(400, "С самим собой дуэль не получится 🙂")
        cp = await self.chat_prefs(chat_id)
        if not cp["duels"]:
            raise EventError(403, "Дуэли в этом чате выключены админами (/settings)")
        await self._check_limit(chat_id)
        ev = await self.store.create_event(
            "duel", chat_id, game.id, user_id, name, int(time.time()) + cp["duel_hours"] * 3600, opponent_id, opponent_name
        )
        await self._post(ev)
        return ev

    # ---------- карточка в чате ----------

    async def card(self, ev: Event) -> tuple[str, InlineKeyboardMarkup | None]:
        game = self.catalog.get(ev.game)
        active = ev.status == "active"
        if ev.kind == "tour":
            rows = await self.store.event_top(ev.id, game.asc, 10)
            lines = [f"{MEDALS[i] if i < 3 else f'{i + 1}.'} {escape(r.name)} — {game.fmt(r.best)}" for i, r in enumerate(rows)]
            status = f"⏳ До финиша: {fmt_left(ev.ends_at - time.time())}" if active else "🏁 Турнир завершён"
            text = (
                f"🏆 <b>Турнир: {escape(game.name)}</b>\n{escape(game.desc)}\n\n"
                "Уровень у всех одинаковый, попыток сколько угодно — в зачёт идёт лучшая.\n"
                f"{status}\n\n" + ("\n".join(lines) if lines else "Пока никто не сыграл — будь первым!")
            )
            play = "▶️ Играть"
        else:
            a = await self.store.event_entry(ev.id, ev.created_by)
            b = await self.store.event_entry(ev.id, ev.opponent_id) if ev.opponent_id else None

            def line(name: str, entry) -> str:
                if entry and entry[0] is not None:
                    return f"{escape(name)} — " + (game.fmt(entry[0]) if not active else "✅ сыграно")
                return f"{escape(name)} — " + ("⏳ ждём" if active else "не сыграно")

            opp = ev.opponent_name or "кто примет вызов?"
            status = f"⏳ Осталось: {fmt_left(ev.ends_at - time.time())}" if active else "🏁 Дуэль завершена"
            text = (
                f"⚔️ <b>Дуэль: {escape(game.name)}</b>\n"
                f"{escape(ev.creator_name)} vs {escape(opp)}\n\n"
                "Один и тот же уровень, у каждого одна попытка. Результаты откроются, когда сыграют оба.\n"
                f"{status}\n\n{line(ev.creator_name, a)}\n"
                + (line(ev.opponent_name, b) if ev.opponent_id else "🫵 Нажми «Принять вызов», чтобы сразиться")
            )
            play = "▶️ Играть" if ev.opponent_id else "⚔️ Принять вызов"
        if not active or not self.links:
            return text, None
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text=play, url=self.links.event(ev.game, ev.id))],
                [InlineKeyboardButton(text="🔄 Обновить", callback_data=f"ev:{ev.id}")],
            ]
        )
        return text, kb

    async def _post(self, ev: Event, pin: bool = False) -> None:
        if not self.bot:
            return
        text, kb = await self.card(ev)
        msg = await self.bot.send_message(ev.chat_id, text, reply_markup=kb)
        await self.store.set_event_message(ev.id, msg.message_id)
        if pin:
            try:
                await self.bot.pin_chat_message(ev.chat_id, msg.message_id, disable_notification=True)
            except TelegramAPIError:
                pass  # у бота нет прав закреплять — не страшно

    async def refresh(self, event_id: int, force: bool = False) -> None:
        """Перерисовать карточку. Без force — не чаще EDIT_EVERY, последнее обновление не теряется."""
        if not self.bot:
            return
        wait = EDIT_EVERY - (time.monotonic() - self._last_edit.get(event_id, 0))
        if wait > 0 and not force:
            if event_id not in self._pending:
                self._pending.add(event_id)
                self._spawn(self._delayed_refresh(event_id, wait))
            return
        self._last_edit[event_id] = time.monotonic()
        ev = await self.store.get_event(event_id)
        if not ev or not ev.message_id:
            return
        text, kb = await self.card(ev)
        try:
            await self.bot.edit_message_text(text=text, chat_id=ev.chat_id, message_id=ev.message_id, reply_markup=kb)
        except TelegramAPIError:
            pass  # «message is not modified» и т.п.

    async def _delayed_refresh(self, event_id: int, wait: float) -> None:
        await asyncio.sleep(wait)
        self._pending.discard(event_id)
        await self.refresh(event_id)

    def _spawn(self, coro) -> None:
        task = asyncio.create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    # ---------- игра: доступ, старт, результат ----------

    @staticmethod
    def _open(ev: Event, grace: int = 0) -> bool:
        return ev.status == "active" and time.time() < ev.ends_at + grace

    async def _join_duel(self, ev: Event, user_id: int, name: str) -> Event:
        if user_id in (ev.created_by, ev.opponent_id):
            return ev
        if ev.opponent_id is None and await self.store.claim_opponent(ev.id, user_id, name):
            self._spawn(self.refresh(ev.id))
            return await self.store.get_event(ev.id)
        raise EventError(403, "Это чужая дуэль — брось свой вызов: /duel")

    async def info(self, ev: Event, user_id: int) -> dict:
        game = self.catalog.get(ev.game)
        entry = await self.store.event_entry(ev.id, user_id)
        left = fmt_left(ev.ends_at - time.time())
        if ev.kind == "tour":
            open_ = self._open(ev)
            return {
                "kind": "tour", "single": False, "closed": not open_,
                "title": f"🏆 Турнир · до финиша {left}" if open_ else "🏁 Турнир завершён",
                "note": "Уровень у всех одинаковый. Попыток сколько угодно, в зачёт идёт лучшая." if open_
                else "Можно потренироваться в обычном режиме: /play " + game.title,
            }
        opp = ev.opponent_name or "?"
        outsider = ev.opponent_id is not None and user_id not in (ev.created_by, ev.opponent_id)
        played = entry is not None
        if not self._open(ev):
            note = "Дуэль завершена"
        elif outsider:
            note = "Это чужая дуэль — брось свой вызов: /duel"
        elif played:
            note = "Попытка использована. Результат откроется, когда сыграет соперник."
        else:
            note = f"Одна попытка! Уровень такой же, как у соперника. Осталось {left}."
        return {
            "kind": "duel", "single": True, "played": played,
            "closed": played or outsider or not self._open(ev),
            "title": f"⚔️ Дуэль: {ev.creator_name} vs {opp}", "note": note,
        }

    async def top(self, ev: Event, user_id: int) -> list:
        game = self.catalog.get(ev.game)
        if ev.kind == "duel" and ev.status == "active":
            entry = await self.store.event_entry(ev.id, user_id)
            if not entry or entry[0] is None:
                return []  # не подглядываем результат соперника до своей попытки
        return await self.store.event_top(ev.id, game.asc, 10)

    async def start(self, ev: Event, user_id: int, name: str) -> None:
        if not self._open(ev):
            raise EventError(410, "Это событие уже закончилось")
        if ev.kind != "duel":
            return
        ev = await self._join_duel(ev, user_id, name)
        if not await self.store.start_attempt(ev.id, user_id, name):
            raise EventError(409, "Ты уже использовал свою попытку в этой дуэли")
        self._spawn(self.refresh(ev.id))

    async def submit(self, ev: Event, user_id: int, name: str, score: int) -> None:
        if not self._open(ev, GRACE):
            raise EventError(410, "Событие уже закончилось")
        game = self.catalog.get(ev.game)
        if ev.kind == "tour":
            await self.store.event_submit(ev.id, user_id, name, score, game.asc, single=False)
            self._spawn(self.refresh(ev.id))
            return
        ev = await self._join_duel(ev, user_id, name)
        if not await self.store.event_submit(ev.id, user_id, name, score, game.asc, single=True):
            raise EventError(409, "Попытка в дуэли не была начата или уже засчитана")
        a = await self.store.event_entry(ev.id, ev.created_by)
        b = await self.store.event_entry(ev.id, ev.opponent_id) if ev.opponent_id else None
        if a and b and a[0] is not None and b[0] is not None and await self.store.finish_event(ev.id):
            self._spawn(self.announce(ev.id))
        else:
            self._spawn(self.refresh(ev.id))

    # ---------- итоги ----------

    async def announce(self, event_id: int) -> None:
        ev = await self.store.get_event(event_id)
        if not ev or not self.bot:
            return
        game = self.catalog.get(ev.game)
        await self.refresh(ev.id, force=True)
        if ev.kind == "tour":
            rows = await self.store.event_top(ev.id, game.asc, 3)
            n = await self.store.event_players(ev.id)
            if rows and self.progress:
                await self.progress.award(rows[0].user_id, "tour_win")
            if rows:
                podium = "\n".join(f"{MEDALS[i]} <b>{escape(r.name)}</b> — {game.fmt(r.best)}" for i, r in enumerate(rows))
                text = f"🏁 Турнир по {escape(game.name)} завершён!\n\n{podium}\n\nУчастников: {n}. Ещё один? /tournament"
            else:
                text = f"🏁 Турнир по {escape(game.name)} завершён — никто не сыграл 😴"
            try:
                await self.bot.unpin_chat_message(ev.chat_id, message_id=ev.message_id)
            except TelegramAPIError:
                pass
        else:
            a = await self.store.event_entry(ev.id, ev.created_by)
            b = await self.store.event_entry(ev.id, ev.opponent_id) if ev.opponent_id else None
            sa = a[0] if a else None
            sb = b[0] if b else None
            A, B = escape(ev.creator_name), escape(ev.opponent_name or "соперник")
            if sa is not None and sb is not None:
                if sa == sb:
                    text = f"🤝 Дуэль в {escape(game.name)}: ничья! {A} и {B} — по {game.fmt(sa)}"
                else:
                    a_wins = (sa < sb) if game.asc else (sa > sb)
                    if self.progress:
                        await self.progress.award(ev.created_by if a_wins else ev.opponent_id, "duel_win")
                    (w, ws), (l, ls) = ((A, sa), (B, sb)) if a_wins else ((B, sb), (A, sa))
                    text = f"⚔️ Дуэль в {escape(game.name)}: 🏆 <b>{w}</b> побеждает {l} — {game.fmt(ws)} против {game.fmt(ls)}"
            elif sa is not None or sb is not None:
                w = A if sa is not None else B
                if self.progress:
                    await self.progress.award(ev.created_by if sa is not None else ev.opponent_id, "duel_win")
                text = f"⚔️ Дуэль в {escape(game.name)}: 🏆 <b>{w}</b> побеждает — соперник не успел сыграть"
            else:
                text = f"⚔️ Дуэль в {escape(game.name)} отменена — никто не сыграл"
        reply = ReplyParameters(message_id=ev.message_id, allow_sending_without_reply=True) if ev.message_id else None
        await self.bot.send_message(ev.chat_id, text, reply_parameters=reply)

    async def tick(self) -> None:
        for ev in await self.store.due_events(int(time.time()) - GRACE):
            if await self.store.finish_event(ev.id):
                try:
                    await self.announce(ev.id)
                except Exception:
                    log.exception("announce %s", ev.id)

    async def run(self, every: float = 15.0) -> None:
        while True:
            try:
                await self.tick()
            except Exception:
                log.exception("events tick")
            await asyncio.sleep(every)
