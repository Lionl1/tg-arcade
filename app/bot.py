"""Telegram-бот: каталог, карточки игр, таблицы рекордов."""

import time
from html import escape

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .catalog import Catalog, Game
from .db import Store
from .events import EventError, Events, fmt_left, parse_duration
from .prefs import CHAT, CHAT_BY_KEY, Prefs
from .links import Links

PAGE = 10
MEDALS = ["🥇", "🥈", "🥉"]
GROUP_ONLY = "Турниры и дуэли работают в группах — добавь меня в чат с друзьями."


def build_router(store: Store, catalog: Catalog, links: Links, events: Events, webapp_url: str = "") -> Router:
    r = Router()

    def hub_button(m: Message, text: str = "🧠 Профиль и тренировка дня") -> InlineKeyboardButton:
        # web_app-кнопки разрешены только в личке; в группах — прямая ссылка на Mini App
        if m.chat.type == "private" and webapp_url.startswith("https://"):
            return InlineKeyboardButton(text=text, web_app=WebAppInfo(url=f"{webapp_url}/hub.html"))
        return InlineKeyboardButton(text=text, url=links.hub())

    async def run_event(m: Message, coro) -> None:
        try:
            await coro
        except EventError as e:
            await m.answer(e.message)

    HOME_TEXT = (
        "🧠 <b>Аркада для мозга</b>\n"
        "Нейросети думают за нас всё больше — мозгу нужна ежедневная нагрузка. "
        "5 минут в день: тренировка дня, учёба с интервальными повторениями, подготовка к ЕГЭ.\n\n"
        "Выбирай раздел:"
    )

    def home_kb() -> InlineKeyboardMarkup:
        # главное — ежедневная тренировка и учёба; аркады и приложения в конце
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🎯 Тренировка дня — 5 минут", url=links.hub()))
        for s in catalog.sections:
            n = len(catalog.list(s.id))
            if n:
                kb.row(InlineKeyboardButton(text=f"{s.title} ({n})", callback_data=f"sec:{s.id}"))
        kb.row(InlineKeyboardButton(text="🎲 Случайная", callback_data="rnd"),
               InlineKeyboardButton(text=f"📋 Всё ({len(catalog)})", callback_data="lst:all:*:0"))
        return kb.as_markup()

    def section_view(sid: str) -> tuple[str, InlineKeyboardMarkup]:
        s = catalog.section(sid)
        kb = InlineKeyboardBuilder()
        for g in s.groups:
            n = len(catalog.list(sid, g.id))
            if n:
                kb.button(text=f"{g.title} ({n})", callback_data=f"lst:{sid}:{g.id}:0")
        kb.button(text=f"📋 Все в разделе ({len(catalog.list(sid))})", callback_data=f"lst:{sid}:*:0")
        kb.button(text="⬅️ Разделы", callback_data="home")
        kb.adjust(2)
        return f"<b>{escape(s.title)}</b>\n{escape(s.desc)}", kb.as_markup()

    def list_view(sid: str, gid: str, page: int) -> tuple[str, InlineKeyboardMarkup]:
        games = catalog.list(None if sid == "all" else sid, None if gid == "*" else gid)
        pages = max(1, -(-len(games) // PAGE))
        page = max(0, min(page, pages - 1))
        kb = InlineKeyboardBuilder()
        for g in games[page * PAGE : (page + 1) * PAGE]:
            kb.button(text=g.name, callback_data=f"g:{g.id}")
        kb.adjust(2)
        nav = []
        if page > 0:
            nav.append(InlineKeyboardButton(text="◀️", callback_data=f"lst:{sid}:{gid}:{page - 1}"))
        section = catalog.section(sid)
        up = f"sec:{sid}" if section and section.groups else "home"
        nav.append(InlineKeyboardButton(text="⬅️ Назад", callback_data=up))
        if page < pages - 1:
            nav.append(InlineKeyboardButton(text="▶️", callback_data=f"lst:{sid}:{gid}:{page + 1}"))
        kb.row(*nav)
        if sid == "all":
            title = "📋 Все игры"
        else:
            group = next((g for g in section.groups if g.id == gid), None)
            title = f"{section.title} · {group.title}" if group else section.title
        suffix = f" · стр. {page + 1}/{pages}" if pages > 1 else ""
        return f"<b>{escape(title)}</b>{suffix} — выбери игру:", kb.as_markup()

    async def top_lines(game: Game, chat_id: int, limit: int, html: bool) -> list[str]:
        rows = await store.top(chat_id, game.id, game.asc, limit)
        esc = escape if html else (lambda s: s)
        return [f"{MEDALS[i] if i < 3 else f'{i + 1}.'} {esc(row.name)} — {game.fmt(row.best)}" for i, row in enumerate(rows)]

    async def send_card(message: Message, game: Game) -> None:
        chat_id = message.chat.id
        if game.app:  # приложение: без рекордов, турниров и дуэлей
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="▶️ Открыть", url=links.play(game, chat_id))],
                [InlineKeyboardButton(text="📂 Ещё разделы", callback_data="home:new")],
            ])
            return await message.answer(f"{game.emoji} <b>{escape(game.title)}</b>\n{escape(game.desc)}", reply_markup=kb)
        best = await store.chat_best(chat_id, game.id, game.asc)
        text = f"{game.emoji} <b>{escape(game.title)}</b>\n{escape(game.desc)}"
        if best:
            text += f"\n\n🏆 Рекорд чата: {escape(best.name)} — {game.fmt(best.best)}"
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="▶️ Играть", url=links.play(game, chat_id))],
                [
                    InlineKeyboardButton(text="🏆 Турнир", callback_data=f"tour:{game.id}"),
                    InlineKeyboardButton(text="⚔️ Дуэль", callback_data=f"duel:{game.id}"),
                ],
                [
                    InlineKeyboardButton(text="📊 Рекорды", callback_data=f"t:{game.id}"),
                    InlineKeyboardButton(text="🎮 Другие игры", callback_data="home:new"),
                ],
            ]
        )
        await message.answer(text, reply_markup=kb)

    @r.message(CommandStart())
    async def start(m: Message, command: CommandObject):
        game = catalog.get(command.args or "")
        if game:
            return await send_card(m, game)
        await m.answer(
            f"🧠 <b>Аркада для мозга</b> — {len(catalog)} тренажёров, курсов и игр прямо в Telegram.\n"
            "Цель простая: не отупеть в эру нейросетей. Каждый день 5 минут — память, внимание, логика, учёба, ЕГЭ.\n\n"
            "Добавь меня в группу: у каждого чата своя таблица рекордов, "
            "а я сообщу, когда кто-то побьёт рекорд.\n\n"
            "/games — каталог\n/play змейка — открыть игру (без названия — случайную)\n/top змейка — рекорды чата\n"
            "/tournament змейка 30м — турнир: у всех один уровень, итоги по таймеру\n"
            "/duel змейка — дуэль (ответом на сообщение — вызвать конкретного человека)\n"
            "/events — что сейчас идёт в чате",
            reply_markup=home_kb(),
        )

    @r.message(Command("profile", "me", "train"))
    async def profile(m: Message):
        await m.answer(
            "🧠 <b>Твой профиль</b>: уровень, навыки, ачивки, серия дней и тренировка дня — "
            "3 коротких игры на разные навыки (≈5 минут). Там же можно включить напоминание.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[hub_button(m)]]),
        )

    # ---------- настройки группы ----------

    prefs = Prefs(store)

    def label(o, v) -> str:
        if isinstance(v, bool):
            return "✅" if v else "❌"
        return o.labels[o.choices.index(v)] if o.labels and v in o.choices else str(v)

    def settings_kb(cp: dict) -> InlineKeyboardMarkup:
        kb = InlineKeyboardBuilder()
        for o in CHAT:
            kb.button(text=f"{o.title}: {label(o, cp[o.key])}", callback_data=f"cs:{o.key}")
        kb.adjust(1)
        return kb.as_markup()

    async def is_admin(chat_id: int, user_id: int, bot) -> bool:
        try:
            m = await bot.get_chat_member(chat_id, user_id)
            return m.status in ("creator", "administrator")
        except Exception:
            return False

    @r.message(Command("settings"))
    async def settings(m: Message):
        if m.chat.type == "private":
            return await m.answer(
                "⚙️ Личные настройки — звук, вибрация, тема, размер текста, сколько игр в тренировке дня, "
                "напоминание, скрытие имени — в Mini App на вкладке «Настройки».\n"
                "Настройки группы — команда /settings прямо в группе (для админов).",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[hub_button(m, "⚙️ Открыть настройки")]]),
            )
        await m.answer("⚙️ <b>Настройки этого чата</b>\nНажми на пункт, чтобы переключить. Менять могут админы.",
                       reply_markup=settings_kb(await prefs.chat(m.chat.id)))

    @r.callback_query(F.data.startswith("cs:"))
    async def cb_setting(c: CallbackQuery):
        o = CHAT_BY_KEY.get(c.data[3:])
        if not o:
            return await c.answer()
        if not await is_admin(c.message.chat.id, c.from_user.id, c.bot):
            return await c.answer("Менять настройки чата могут только админы", show_alert=True)
        cp = await prefs.chat(c.message.chat.id)
        cp = await prefs.set_chat(c.message.chat.id, o.key, Prefs.cycle(o, cp[o.key]))
        await c.message.edit_reply_markup(reply_markup=settings_kb(cp))
        await c.answer(f"{o.title}: {label(o, cp[o.key])}")

    @r.message(Command("apps"))
    async def apps(m: Message):
        text, kb = list_view("apps", "*", 0) if catalog.section("apps") else (HOME_TEXT, home_kb())
        await m.answer(text, reply_markup=kb)

    @r.message(Command("algo"))
    async def algo(m: Message):
        sec = catalog.section("algo")
        text, kb = (section_view("algo") if sec.groups else list_view("algo", "*", 0)) if sec else (HOME_TEXT, home_kb())
        await m.answer(text, reply_markup=kb)

    @r.message(Command("games", "help"))
    async def games(m: Message):
        await m.answer(HOME_TEXT, reply_markup=home_kb())

    @r.message(Command("play"))
    async def play(m: Message, command: CommandObject):
        game = catalog.find(command.args) if command.args else catalog.random()
        if not game:
            return await m.answer("Не нашёл такую игру. /games — весь каталог")
        await send_card(m, game)

    @r.message(Command("top"))
    async def top(m: Message, command: CommandObject):
        game = catalog.find(command.args or "")
        if not game:
            return await m.answer("Укажи игру: <code>/top змейка</code>")
        lines = await top_lines(game, m.chat.id, 10, html=True)
        body = "\n".join(lines) if lines else "Пока никто не играл."
        await m.answer(f"🏆 <b>{escape(game.name)}</b>\n\n{body}")

    @r.message(Command("tournament", "tour"))
    async def tournament(m: Message, command: CommandObject):
        if m.chat.type == "private":
            return await m.answer(GROUP_ONLY)
        tokens = (command.args or "").split()
        minutes = None  # по умолчанию — из настроек чата (/settings)
        if tokens and (parsed := parse_duration(tokens[-1])) is not None:
            minutes = parsed
            tokens = tokens[:-1]
        game = catalog.find(" ".join(tokens)) if tokens else catalog.random()
        if not game:
            return await m.answer("Не нашёл игру. Пример: <code>/tournament змейка 30м</code>")
        await run_event(m, events.create_tournament(m.chat.id, game, minutes, m.from_user.id, m.from_user.full_name[:64]))

    @r.message(Command("duel"))
    async def duel(m: Message, command: CommandObject):
        if m.chat.type == "private":
            return await m.answer(GROUP_ONLY)
        game = catalog.find(command.args) if command.args else catalog.random()
        if not game:
            return await m.answer("Не нашёл игру. Пример: <code>/duel змейка</code>")
        target = m.reply_to_message.from_user if m.reply_to_message and m.reply_to_message.from_user else None
        if target and target.is_bot:
            return await m.answer("Ботов на дуэль не вызывают 🤖 Ответь на сообщение человека.")
        await run_event(m, events.create_duel(
            m.chat.id, game, m.from_user.id, m.from_user.full_name[:64],
            target.id if target else None, target.full_name[:64] if target else None,
        ))

    @r.message(Command("events"))
    async def list_events(m: Message):
        active = await store.active_events(m.chat.id)
        if not active:
            return await m.answer("Сейчас ничего не идёт. Запусти: /tournament или /duel")
        kb = InlineKeyboardBuilder()
        lines = []
        for ev in active:
            game = catalog.get(ev.game)
            if ev.kind == "tour":
                lines.append(f"🏆 Турнир: {escape(game.name)} — ещё {fmt_left(ev.ends_at - time.time())}")
            else:
                lines.append(f"⚔️ Дуэль: {escape(game.name)} — {escape(ev.creator_name)} vs {escape(ev.opponent_name or '?')}")
            kb.button(text=f"{'🏆' if ev.kind == 'tour' else '⚔️'} {game.title}", url=links.event(ev.game, ev.id))
        kb.adjust(2)
        await m.answer("\n".join(lines), reply_markup=kb.as_markup())

    @r.callback_query(F.data.startswith("tour:") | F.data.startswith("duel:"))
    async def cb_new_event(c: CallbackQuery):
        kind, game_id = c.data.split(":", 1)
        game = catalog.get(game_id)
        if not game:
            return await c.answer("Игра не найдена")
        if c.message.chat.type == "private":
            return await c.answer(GROUP_ONLY, show_alert=True)
        name = c.from_user.full_name[:64]
        try:
            if kind == "tour":
                await events.create_tournament(c.message.chat.id, game, None, c.from_user.id, name)
            else:
                await events.create_duel(c.message.chat.id, game, c.from_user.id, name)
        except EventError as e:
            return await c.answer(e.message, show_alert=True)
        await c.answer()

    @r.callback_query(F.data.startswith("ev:"))
    async def cb_refresh(c: CallbackQuery):
        await events.refresh(int(c.data[3:]), force=True)
        await c.answer("Обновлено")

    @r.callback_query(F.data.startswith("home"))
    async def cb_home(c: CallbackQuery):
        if c.data == "home:new":  # из карточки игры — не трогаем саму карточку
            await c.message.answer(HOME_TEXT, reply_markup=home_kb())
        else:
            await c.message.edit_text(HOME_TEXT, reply_markup=home_kb())
        await c.answer()

    @r.callback_query(F.data.startswith("sec:"))
    async def cb_section(c: CallbackQuery):
        sid = c.data[4:]
        section = catalog.section(sid)
        if not section:
            return await c.answer("Раздел не найден")
        text, kb = section_view(sid) if section.groups else list_view(sid, "*", 0)
        await c.message.edit_text(text, reply_markup=kb)
        await c.answer()

    @r.callback_query(F.data.startswith("lst:"))
    async def cb_list(c: CallbackQuery):
        _, sid, gid, page = c.data.split(":")
        if sid != "all" and not catalog.section(sid):
            return await c.answer("Раздел не найден")
        text, kb = list_view(sid, gid, int(page))
        await c.message.edit_text(text, reply_markup=kb)
        await c.answer()

    # старые кнопки из сообщений, отправленных до появления разделов
    @r.callback_query(F.data.startswith("genres") | F.data.startswith("cat:"))
    async def cb_legacy(c: CallbackQuery):
        await c.message.answer(HOME_TEXT, reply_markup=home_kb())
        await c.answer()

    @r.callback_query(F.data == "rnd")
    async def cb_random(c: CallbackQuery):
        await send_card(c.message, catalog.random())
        await c.answer()

    @r.callback_query(F.data.startswith("g:"))
    async def cb_game(c: CallbackQuery):
        game = catalog.get(c.data[2:])
        if not game:
            return await c.answer("Игра не найдена")
        await send_card(c.message, game)
        await c.answer()

    @r.callback_query(F.data.startswith("t:"))
    async def cb_top(c: CallbackQuery):
        game = catalog.get(c.data[2:])
        if not game:
            return await c.answer("Игра не найдена")
        lines = await top_lines(game, c.message.chat.id, 5, html=False)
        text = f"🏆 {game.title}\n" + ("\n".join(lines) if lines else "Пока никто не играл")
        await c.answer(text[:200], show_alert=True)

    return r
