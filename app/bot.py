"""Telegram-бот: каталог, карточки игр, таблицы рекордов. Два языка: русский и английский."""

import time
from html import escape

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, Chat, InlineKeyboardButton, InlineKeyboardMarkup, Message, User, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .catalog import Catalog, Game
from .db import Store
from .events import EventError, Events, fmt_left, parse_duration
from .i18n import LANGS, pick, tr
from .links import Links
from .prefs import CHAT, CHAT_BY_KEY, Prefs

PAGE = 10
MEDALS = ["🥇", "🥈", "🥉"]


def group_only(L: str) -> str:
    return tr(L, "Турниры и дуэли работают в группах — добавь меня в чат с друзьями.",
              "Tournaments and duels work in groups — add me to a chat with friends.")


def home_text(L: str) -> str:
    return tr(
        L,
        "🧠 <b>Аркада для мозга</b>\n"
        "ИИ думает за нас всё больше. Здесь — ежедневная тренировка, чтобы не отупеть.\n\n"
        "Четыре опоры, одна система прогресса:\n"
        "🧠 <b>Ум</b> — внимание, память, логика · 📚 <b>Знания</b> — учёба и экзамены\n"
        "💻 <b>Код</b> — алгоритмы и программирование · 💪 <b>Тело</b> — тренировки и разминки\n\n"
        "🎯 Тренировка дня берёт по игре из каждой опоры, 🧭 пути ведут через разделы к цели, "
        "а опыт, навыки и граф знаний — общие для всего.\n\nВыбирай:",
        "🧠 <b>Brain Arcade</b>\n"
        "AI does more and more of our thinking. This is a daily workout to stay sharp.\n\n"
        "Four pillars, one progress system:\n"
        "🧠 <b>Mind</b> — attention, memory, logic · 📚 <b>Knowledge</b> — study and exams\n"
        "💻 <b>Code</b> — algorithms and programming · 💪 <b>Body</b> — workouts and breaks\n\n"
        "🎯 The daily workout takes a game from each pillar, 🧭 paths lead through sections towards a goal, "
        "and XP, skills and the knowledge graph are shared by everything.\n\nChoose:",
    )


def build_router(store: Store, catalog: Catalog, links: Links, events: Events, webapp_url: str = "") -> Router:
    r = Router()
    prefs = Prefs(store)

    async def lang_of(user: User | None, chat: Chat) -> str:
        """Язык ответа: настройка чата (в группах) → личная настройка → язык Telegram."""
        if chat.type != "private":
            cl = (await prefs.chat(chat.id))["lang"]
            if cl in LANGS:
                return cl
        if not user:
            return "ru"
        return pick((await prefs.user(user.id))["lang"], user.language_code)

    def hub_button(m: Message, L: str, text: str | None = None) -> InlineKeyboardButton:
        text = text or tr(L, "🧠 Профиль и тренировка дня", "🧠 Profile and daily workout")
        # web_app-кнопки разрешены только в личке; в группах — прямая ссылка на Mini App
        if m.chat.type == "private" and webapp_url.startswith("https://"):
            return InlineKeyboardButton(text=text, web_app=WebAppInfo(url=f"{webapp_url}/hub.html"))
        return InlineKeyboardButton(text=text, url=links.hub())

    async def run_event(m: Message, coro) -> None:
        try:
            await coro
        except EventError as e:
            await m.answer(e.message)

    def home_kb(L: str) -> InlineKeyboardMarkup:
        # главное — ежедневная тренировка и учёба; аркады и приложения в конце
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text=tr(L, "🎯 Тренировка дня", "🎯 Daily workout"), url=links.hub()),
               InlineKeyboardButton(text=tr(L, "🧭 Пути", "🧭 Paths"), callback_data="paths"))
        for s in catalog.sections:
            n = len(catalog.list(s.id, lang=L))
            if n:
                kb.row(InlineKeyboardButton(text=f"{s.t(L)} ({n})", callback_data=f"sec:{s.id}"))
        kb.row(InlineKeyboardButton(text=tr(L, "🎲 Случайная", "🎲 Random"), callback_data="rnd"),
               InlineKeyboardButton(text=tr(L, "📋 Всё", "📋 All") + f" ({catalog.count(L)})", callback_data="lst:all:*:0"))
        return kb.as_markup()

    def section_view(sid: str, L: str) -> tuple[str, InlineKeyboardMarkup]:
        s = catalog.section(sid)
        kb = InlineKeyboardBuilder()
        for g in s.groups:
            n = len(catalog.list(sid, g.id, L))
            if n:
                kb.button(text=f"{g.t(L)} ({n})", callback_data=f"lst:{sid}:{g.id}:0")
        kb.button(text=tr(L, "📋 Все в разделе", "📋 Whole section") + f" ({len(catalog.list(sid, lang=L))})", callback_data=f"lst:{sid}:*:0")
        kb.button(text=tr(L, "⬅️ Разделы", "⬅️ Sections"), callback_data="home")
        kb.adjust(2)
        return f"<b>{escape(s.t(L))}</b>\n{escape(s.d(L))}", kb.as_markup()

    def list_view(sid: str, gid: str, page: int, L: str) -> tuple[str, InlineKeyboardMarkup]:
        games = catalog.list(None if sid == "all" else sid, None if gid == "*" else gid, L)
        pages = max(1, -(-len(games) // PAGE))
        page = max(0, min(page, pages - 1))
        kb = InlineKeyboardBuilder()
        for g in games[page * PAGE : (page + 1) * PAGE]:
            kb.button(text=g.label(L), callback_data=f"g:{g.id}")
        kb.adjust(2)
        nav = []
        if page > 0:
            nav.append(InlineKeyboardButton(text="◀️", callback_data=f"lst:{sid}:{gid}:{page - 1}"))
        section = catalog.section(sid)
        up = f"sec:{sid}" if section and section.groups else "home"
        nav.append(InlineKeyboardButton(text=tr(L, "⬅️ Назад", "⬅️ Back"), callback_data=up))
        if page < pages - 1:
            nav.append(InlineKeyboardButton(text="▶️", callback_data=f"lst:{sid}:{gid}:{page + 1}"))
        kb.row(*nav)
        if sid == "all":
            title = tr(L, "📋 Все игры", "📋 All games")
        else:
            group = next((g for g in section.groups if g.id == gid), None)
            title = f"{section.t(L)} · {group.t(L)}" if group else section.t(L)
        suffix = tr(L, f" · стр. {page + 1}/{pages}", f" · page {page + 1}/{pages}") if pages > 1 else ""
        return f"<b>{escape(title)}</b>{suffix} — " + tr(L, "выбери игру:", "pick a game:"), kb.as_markup()

    async def top_lines(game: Game, chat_id: int, limit: int, html: bool, L: str) -> list[str]:
        rows = await store.top(chat_id, game.id, game.asc, limit)
        esc = escape if html else (lambda s: s)
        return [f"{MEDALS[i] if i < 3 else f'{i + 1}.'} {esc(row.name)} — {game.fmt(row.best, L)}" for i, row in enumerate(rows)]

    async def send_card(message: Message, game: Game, L: str) -> None:
        chat_id = message.chat.id
        head = f"{game.emoji} <b>{escape(game.t(L))}</b>\n{escape(game.d(L))}"
        if game.app:  # приложение: без рекордов, турниров и дуэлей
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text=tr(L, "▶️ Открыть", "▶️ Open"), url=links.play(game, chat_id))],
                [InlineKeyboardButton(text=tr(L, "📂 Ещё разделы", "📂 More sections"), callback_data="home:new")],
            ])
            return await message.answer(head, reply_markup=kb)
        best = await store.chat_best(chat_id, game.id, game.asc)
        text = head
        if best:
            text += "\n\n" + tr(L, "🏆 Рекорд чата", "🏆 Chat record") + f": {escape(best.name)} — {game.fmt(best.best, L)}"
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text=tr(L, "▶️ Играть", "▶️ Play"), url=links.play(game, chat_id))],
                [
                    InlineKeyboardButton(text=tr(L, "🏆 Турнир", "🏆 Tournament"), callback_data=f"tour:{game.id}"),
                    InlineKeyboardButton(text=tr(L, "⚔️ Дуэль", "⚔️ Duel"), callback_data=f"duel:{game.id}"),
                ],
                [
                    InlineKeyboardButton(text=tr(L, "📊 Рекорды", "📊 Records"), callback_data=f"t:{game.id}"),
                    InlineKeyboardButton(text=tr(L, "🎮 Другие игры", "🎮 Other games"), callback_data="home:new"),
                ],
            ]
        )
        await message.answer(text, reply_markup=kb)

    @r.message(CommandStart())
    async def start(m: Message, command: CommandObject):
        L = await lang_of(m.from_user, m.chat)
        game = catalog.get(command.args or "")
        if game:
            return await send_card(m, game, L)
        n = catalog.count(L)
        await m.answer(
            tr(
                L,
                f"🧠 <b>Аркада для мозга</b> — {n} тренажёров, курсов и игр прямо в Telegram.\n"
                "Цель простая: не отупеть в эру нейросетей. Каждый день 5 минут — память, внимание, логика, учёба, ЕГЭ.\n\n"
                "Добавь меня в группу: у каждого чата своя таблица рекордов, "
                "а я сообщу, когда кто-то побьёт рекорд.\n\n"
                "/games — каталог\n/play змейка — открыть игру (без названия — случайную)\n/top змейка — рекорды чата\n"
                "/tournament змейка 30м — турнир: у всех один уровень, итоги по таймеру\n"
                "/duel змейка — дуэль (ответом на сообщение — вызвать конкретного человека)\n"
                "/events — что сейчас идёт в чате\n/settings — настройки, язык (English)",
                f"🧠 <b>Brain Arcade</b> — {n} brain trainers, courses and games right inside Telegram.\n"
                "The goal is simple: stay sharp in the age of AI. 5 minutes a day — memory, attention, logic, study, exam prep.\n\n"
                "Add me to a group: every chat gets its own leaderboard, "
                "and I'll announce when someone beats a record.\n\n"
                "/games — catalog\n/play snake — open a game (no name — a random one)\n/top snake — chat records\n"
                "/tournament snake 30m — tournament: same level for everyone, results when the timer ends\n"
                "/duel snake — duel (as a reply — challenge that person)\n"
                "/events — what's running in the chat\n/settings — settings, language (Русский)",
            ),
            reply_markup=home_kb(L),
        )

    @r.message(Command("profile", "me", "train"))
    async def profile(m: Message):
        L = await lang_of(m.from_user, m.chat)
        await m.answer(
            tr(L, "🧠 <b>Твой профиль</b>: уровень, навыки, ачивки, серия дней и тренировка дня — "
                  "3 коротких игры на разные навыки (≈5 минут). Там же можно включить напоминание.",
               "🧠 <b>Your profile</b>: level, skills, achievements, day streak and the daily workout — "
               "3 short games for different skills (≈5 minutes). You can turn on a reminder there too."),
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[hub_button(m, L)]]),
        )

    # ---------- настройки: личные (язык) и группы ----------

    def label(o, v, L: str) -> str:
        if isinstance(v, bool):
            return "✅" if v else "❌"
        return o.label(L, v)

    def settings_kb(cp: dict, L: str) -> InlineKeyboardMarkup:
        kb = InlineKeyboardBuilder()
        for o in CHAT:
            kb.button(text=f"{o.t(L)}: {label(o, cp[o.key], L)}", callback_data=f"cs:{o.key}")
        kb.adjust(1)
        return kb.as_markup()

    def lang_kb(cur: str, L: str) -> InlineKeyboardMarkup:
        names = {"auto": tr(L, "Как в Telegram", "Same as Telegram"), "ru": "Русский", "en": "English"}
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text=("✅ " if cur == k else "") + v, callback_data=f"ul:{k}") for k, v in names.items()
        ]])

    async def is_admin(chat_id: int, user_id: int, bot) -> bool:
        try:
            m = await bot.get_chat_member(chat_id, user_id)
            return m.status in ("creator", "administrator")
        except Exception:
            return False

    @r.message(Command("settings", "lang", "language"))
    async def settings(m: Message):
        L = await lang_of(m.from_user, m.chat)
        if m.chat.type == "private":
            cur = (await prefs.user(m.from_user.id))["lang"]
            return await m.answer(
                tr(L, "⚙️ <b>Язык</b> — выбери ниже.\n"
                      "Остальные личные настройки — звук, вибрация, тема, размер текста, сколько игр в тренировке дня, "
                      "напоминание, скрытие имени — в Mini App на вкладке «Настройки».\n"
                      "Настройки группы — команда /settings прямо в группе (для админов).",
                   "⚙️ <b>Language</b> — choose below.\n"
                   "Other personal settings — sound, vibration, theme, text size, games in the daily workout, "
                   "reminder, hiding your name — are in the Mini App, “Settings” tab.\n"
                   "Group settings — the /settings command right in the group (for admins)."),
                reply_markup=InlineKeyboardMarkup(inline_keyboard=lang_kb(cur, L).inline_keyboard
                                                  + [[hub_button(m, L, tr(L, "⚙️ Открыть настройки", "⚙️ Open settings"))]]),
            )
        await m.answer(tr(L, "⚙️ <b>Настройки этого чата</b>\nНажми на пункт, чтобы переключить. Менять могут админы.",
                          "⚙️ <b>This chat's settings</b>\nTap an item to switch it. Only admins can change them."),
                       reply_markup=settings_kb(await prefs.chat(m.chat.id), L))

    @r.callback_query(F.data.startswith("ul:"))
    async def cb_user_lang(c: CallbackQuery):
        v = c.data[3:]
        if v not in ("auto", *LANGS):
            return await c.answer()
        await store._exec("INSERT OR IGNORE INTO users (user_id, name, created) VALUES (?, ?, ?)",
                          (c.from_user.id, c.from_user.full_name[:64], int(time.time())))
        await prefs.set_user(c.from_user.id, {"lang": v})
        L = pick(v, c.from_user.language_code)
        await store._exec("UPDATE users SET lang=? WHERE user_id=?", (L, c.from_user.id))
        await c.message.edit_reply_markup(reply_markup=InlineKeyboardMarkup(
            inline_keyboard=lang_kb(v, L).inline_keyboard + c.message.reply_markup.inline_keyboard[1:]))
        await c.answer(tr(L, "Язык: русский", "Language: English"))
        await c.message.answer(home_text(L), reply_markup=home_kb(L))

    @r.callback_query(F.data.startswith("cs:"))
    async def cb_setting(c: CallbackQuery):
        o = CHAT_BY_KEY.get(c.data[3:])
        L = await lang_of(c.from_user, c.message.chat)
        if not o:
            return await c.answer()
        if not await is_admin(c.message.chat.id, c.from_user.id, c.bot):
            return await c.answer(tr(L, "Менять настройки чата могут только админы", "Only admins can change chat settings"), show_alert=True)
        cp = await prefs.chat(c.message.chat.id)
        cp = await prefs.set_chat(c.message.chat.id, o.key, Prefs.cycle(o, cp[o.key]))
        L = await lang_of(c.from_user, c.message.chat)  # язык чата мог только что поменяться
        await c.message.edit_text(tr(L, "⚙️ <b>Настройки этого чата</b>\nНажми на пункт, чтобы переключить. Менять могут админы.",
                                     "⚙️ <b>This chat's settings</b>\nTap an item to switch it. Only admins can change them."),
                                  reply_markup=settings_kb(cp, L))
        await c.answer(f"{o.t(L)}: {label(o, cp[o.key], L)}")

    @r.message(Command("apps"))
    async def apps(m: Message):
        L = await lang_of(m.from_user, m.chat)
        text, kb = list_view("apps", "*", 0, L) if catalog.section("apps") else (home_text(L), home_kb(L))
        await m.answer(text, reply_markup=kb)

    @r.message(Command("algo"))
    async def algo(m: Message):
        L = await lang_of(m.from_user, m.chat)
        sec = catalog.section("algo")
        text, kb = (section_view("algo", L) if sec.groups else list_view("algo", "*", 0, L)) if sec else (home_text(L), home_kb(L))
        await m.answer(text, reply_markup=kb)

    @r.message(Command("games", "help"))
    async def games(m: Message):
        L = await lang_of(m.from_user, m.chat)
        await m.answer(home_text(L), reply_markup=home_kb(L))

    @r.message(Command("play"))
    async def play(m: Message, command: CommandObject):
        L = await lang_of(m.from_user, m.chat)
        game = catalog.find(command.args, L) if command.args else catalog.random(L)
        if not game:
            return await m.answer(tr(L, "Не нашёл такую игру. /games — весь каталог", "Couldn't find that game. /games — the whole catalog"))
        await send_card(m, game, L)

    @r.message(Command("top"))
    async def top(m: Message, command: CommandObject):
        L = await lang_of(m.from_user, m.chat)
        game = catalog.find(command.args or "", L)
        if not game:
            return await m.answer(tr(L, "Укажи игру: <code>/top змейка</code>", "Name a game: <code>/top snake</code>"))
        lines = await top_lines(game, m.chat.id, 10, True, L)
        body = "\n".join(lines) if lines else tr(L, "Пока никто не играл.", "No one has played yet.")
        await m.answer(f"🏆 <b>{escape(game.label(L))}</b>\n\n{body}")

    @r.message(Command("tournament", "tour"))
    async def tournament(m: Message, command: CommandObject):
        L = await lang_of(m.from_user, m.chat)
        if m.chat.type == "private":
            return await m.answer(group_only(L))
        tokens = (command.args or "").split()
        minutes = None  # по умолчанию — из настроек чата (/settings)
        if tokens and (parsed := parse_duration(tokens[-1])) is not None:
            minutes = parsed
            tokens = tokens[:-1]
        game = catalog.find(" ".join(tokens), L) if tokens else catalog.random(L)
        if not game:
            return await m.answer(tr(L, "Не нашёл игру. Пример: <code>/tournament змейка 30м</code>",
                                     "Couldn't find the game. Example: <code>/tournament snake 30m</code>"))
        await run_event(m, events.create_tournament(m.chat.id, game, minutes, m.from_user.id, m.from_user.full_name[:64], L))

    @r.message(Command("duel"))
    async def duel(m: Message, command: CommandObject):
        L = await lang_of(m.from_user, m.chat)
        if m.chat.type == "private":
            return await m.answer(group_only(L))
        game = catalog.find(command.args, L) if command.args else catalog.random(L)
        if not game:
            return await m.answer(tr(L, "Не нашёл игру. Пример: <code>/duel змейка</code>", "Couldn't find the game. Example: <code>/duel snake</code>"))
        target = m.reply_to_message.from_user if m.reply_to_message and m.reply_to_message.from_user else None
        if target and target.is_bot:
            return await m.answer(tr(L, "Ботов на дуэль не вызывают 🤖 Ответь на сообщение человека.",
                                     "Bots don't duel 🤖 Reply to a human's message."))
        await run_event(m, events.create_duel(
            m.chat.id, game, m.from_user.id, m.from_user.full_name[:64],
            target.id if target else None, target.full_name[:64] if target else None, L,
        ))

    @r.message(Command("events"))
    async def list_events(m: Message):
        L = await lang_of(m.from_user, m.chat)
        active = await store.active_events(m.chat.id)
        if not active:
            return await m.answer(tr(L, "Сейчас ничего не идёт. Запусти: /tournament или /duel", "Nothing is running now. Start one: /tournament or /duel"))
        kb = InlineKeyboardBuilder()
        lines = []
        for ev in active:
            game = catalog.get(ev.game)
            if ev.kind == "tour":
                lines.append(tr(L, "🏆 Турнир", "🏆 Tournament") + f": {escape(game.label(L))} — "
                             + tr(L, "ещё ", "") + fmt_left(ev.ends_at - time.time(), L) + tr(L, "", " left"))
            else:
                lines.append(tr(L, "⚔️ Дуэль", "⚔️ Duel") + f": {escape(game.label(L))} — {escape(ev.creator_name)} vs {escape(ev.opponent_name or '?')}")
            kb.button(text=f"{'🏆' if ev.kind == 'tour' else '⚔️'} {game.t(L)}", url=links.event(ev.game, ev.id))
        kb.adjust(2)
        await m.answer("\n".join(lines), reply_markup=kb.as_markup())

    @r.callback_query(F.data.startswith("tour:") | F.data.startswith("duel:"))
    async def cb_new_event(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        kind, game_id = c.data.split(":", 1)
        game = catalog.get(game_id)
        if not game:
            return await c.answer(tr(L, "Игра не найдена", "Game not found"))
        if c.message.chat.type == "private":
            return await c.answer(group_only(L), show_alert=True)
        name = c.from_user.full_name[:64]
        try:
            if kind == "tour":
                await events.create_tournament(c.message.chat.id, game, None, c.from_user.id, name, L)
            else:
                await events.create_duel(c.message.chat.id, game, c.from_user.id, name, lang=L)
        except EventError as e:
            return await c.answer(e.message, show_alert=True)
        await c.answer()

    @r.callback_query(F.data.startswith("ev:"))
    async def cb_refresh(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        await events.refresh(int(c.data[3:]), force=True)
        await c.answer(tr(L, "Обновлено", "Refreshed"))

    @r.callback_query(F.data.startswith("home"))
    async def cb_home(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        if c.data == "home:new":  # из карточки игры — не трогаем саму карточку
            await c.message.answer(home_text(L), reply_markup=home_kb(L))
        else:
            await c.message.edit_text(home_text(L), reply_markup=home_kb(L))
        await c.answer()

    @r.callback_query(F.data.startswith("sec:"))
    async def cb_section(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        sid = c.data[4:]
        section = catalog.section(sid)
        if not section:
            return await c.answer(tr(L, "Раздел не найден", "Section not found"))
        text, kb = section_view(sid, L) if section.groups else list_view(sid, "*", 0, L)
        await c.message.edit_text(text, reply_markup=kb)
        await c.answer()

    @r.callback_query(F.data.startswith("lst:"))
    async def cb_list(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        _, sid, gid, page = c.data.split(":")
        if sid != "all" and not catalog.section(sid):
            return await c.answer(tr(L, "Раздел не найден", "Section not found"))
        text, kb = list_view(sid, gid, int(page), L)
        await c.message.edit_text(text, reply_markup=kb)
        await c.answer()

    # ---------- пути: сквозные маршруты через разделы ----------

    async def paths_text(user: User, L: str) -> str:
        paths = await events.progress.paths_for(user.id, L) if events.progress else []
        lines = [tr(L, "🧭 <b>Пути</b> — маршруты через разные разделы к одной цели. Каждая игра в пути опирается на предыдущие.\n",
                    "🧭 <b>Paths</b> — routes through different sections towards one goal. Each game on a path builds on the previous ones.\n")]
        for p in paths:
            filled = round(10 * p["done"] / max(1, p["total"]))
            nxt = catalog.get(p["next"]["game"]) if p["next"] else None
            step = (tr(L, "дальше: ", "next: ") + nxt.label(L)) if nxt else tr(L, "🏁 пройден", "🏁 complete")
            lines.append(f"{p['emoji']} <b>{escape(p['title'])}</b> {'▰' * filled}{'▱' * (10 - filled)} {p['done']}/{p['total']}\n<i>{escape(step)}</i>")
        return "\n".join(lines)

    @r.message(Command("paths", "path"))
    async def paths_cmd(m: Message):
        L = await lang_of(m.from_user, m.chat)
        await m.answer(await paths_text(m.from_user, L), reply_markup=InlineKeyboardMarkup(inline_keyboard=[[hub_button(m, L, tr(L, "🧭 Открыть пути", "🧭 Open paths"))]]))

    @r.callback_query(F.data == "paths")
    async def cb_paths(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        await c.message.answer(await paths_text(c.from_user, L), reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text=tr(L, "🧭 Открыть пути", "🧭 Open paths"), url=links.hub())]]))
        await c.answer()

    @r.message(Command("week", "stats"))
    async def week_cmd(m: Message):
        """Итоги недели: активность, опыт, опоры — и что подтянуть."""
        from .progress import local_now
        L = await lang_of(m.from_user, m.chat)
        if not events.progress:
            return
        row = await store._one("SELECT tz FROM users WHERE user_id=?", (m.from_user.id,))
        day = local_now(row[0] if row else -180).date().isoformat()
        a = await events.progress.activity(m.from_user.id, day)
        w = a["week"]
        bars = "".join("🟩" if d["plays"] >= 3 else "🟨" if d["plays"] else "⬜" for d in a["days"][-7:])
        trend = ""
        if w["prev_xp"]:
            diff = round(100 * (w["xp"] - w["prev_xp"]) / w["prev_xp"])
            trend = f" ({'+' if diff >= 0 else ''}{diff}% " + tr(L, "к прошлой неделе)", "vs last week)")
        pil = {p["id"]: p for p in catalog.pillars}
        main = ["mind", "knowledge", "code", "body"]
        got = " · ".join(f"{pil[k]['emoji']} {w['pillars'].get(k, 0)}" for k in main if k in pil)
        missing = [pil[k] for k in main if k in pil and not w["pillars"].get(k)]
        tip = (tr(L, "Подтяни на этой неделе: ", "Work on this week: ") + ", ".join(f"{p['emoji']} {tr(L, p['title'], p['title_en'])}" for p in missing)
               if missing else tr(L, "Все четыре опоры в деле — так держать! 💪", "All four pillars covered — keep it up! 💪"))
        await m.answer(
            tr(L, f"📅 <b>Твоя неделя</b>\n{bars}\nДней с тренировкой: {w['active_days']}/7 · партий: {w['plays']} · опыт: +{w['xp']} XP{trend}\nПо опорам: {got}\n\n{tip}",
               f"📅 <b>Your week</b>\n{bars}\nActive days: {w['active_days']}/7 · rounds: {w['plays']} · XP: +{w['xp']}{trend}\nBy pillar: {got}\n\n{tip}"),
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[hub_button(m, L)]]))

    # ---------- пасхалки: скрытые команды (их нет в меню команд) ----------

    @r.message(Command("coffee", "tea", "teapot"))
    async def egg_coffee(m: Message):
        L = await lang_of(m.from_user, m.chat)
        got = events.progress and await events.progress.award(m.from_user.id, "teapot") if m.from_user else False
        await m.answer(tr(L, "🫖 <b>418 I’m a teapot</b>\nКофе не варю — я чайник. Но мозг заварю: /games",
                          "🫖 <b>418 I’m a teapot</b>\nI don’t brew coffee — I’m a teapot. I can brew your brain though: /games")
                       + ("\n\n" + tr(L, "🥚 Пасхалка найдена: «Я чайник»!", "🥚 Easter egg found: “I’m a teapot”!") if got else ""))

    @r.message(Command("42"))
    async def egg_42(m: Message):
        L = await lang_of(m.from_user, m.chat)
        await m.answer(tr(L, "🌌 Ответ найден. Осталось понять вопрос.\nПодсказка: набери ровно 42 очка в любой игре.",
                          "🌌 The answer is found. Now to figure out the question.\nHint: score exactly 42 in any game."))

    @r.message(Command("konami"))
    async def egg_konami(m: Message):
        L = await lang_of(m.from_user, m.chat)
        await m.answer(tr(L, "🎮 ↑ ↑ ↓ ↓ ← → ← → B A\nГде-то в профиле это сработает. На телефоне — свайпами по экрану, B и A — тапы слева и справа.",
                          "🎮 ↑ ↑ ↓ ↓ ← → ← → B A\nSomewhere in the profile this works. On a phone: swipe on the screen, B and A are taps on the left and right."))

    @r.message(Command("secrets", "eggs"))
    async def egg_list(m: Message):
        from .progress import EGGS
        L = await lang_of(m.from_user, m.chat)
        rows = await store._all("SELECT code FROM achievements WHERE user_id=?", (m.from_user.id,)) if m.from_user else []
        have = {c for (c,) in rows}
        lines = [f"{a.emoji} <b>{escape(a.view(L)['title'])}</b>" if a.code in have else f"❓ <i>{escape(a.hidden(L)['desc'])}</i>" for a in EGGS]
        found = sum(a.code in have for a in EGGS)
        await m.answer(tr(L, f"🥚 <b>Пасхалки: {found} из {len(EGGS)}</b>\n\n", f"🥚 <b>Easter eggs: {found} of {len(EGGS)}</b>\n\n") + "\n".join(lines))

    # старые кнопки из сообщений, отправленных до появления разделов
    @r.callback_query(F.data.startswith("genres") | F.data.startswith("cat:"))
    async def cb_legacy(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        await c.message.answer(home_text(L), reply_markup=home_kb(L))
        await c.answer()

    @r.callback_query(F.data == "rnd")
    async def cb_random(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        await send_card(c.message, catalog.random(L), L)
        await c.answer()

    @r.callback_query(F.data.startswith("g:"))
    async def cb_game(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        game = catalog.get(c.data[2:])
        if not game:
            return await c.answer(tr(L, "Игра не найдена", "Game not found"))
        await send_card(c.message, game, L)
        await c.answer()

    @r.callback_query(F.data.startswith("t:"))
    async def cb_top(c: CallbackQuery):
        L = await lang_of(c.from_user, c.message.chat)
        game = catalog.get(c.data[2:])
        if not game:
            return await c.answer(tr(L, "Игра не найдена", "Game not found"))
        lines = await top_lines(game, c.message.chat.id, 5, False, L)
        text = f"🏆 {game.t(L)}\n" + ("\n".join(lines) if lines else tr(L, "Пока никто не играл", "No one has played yet"))
        await c.answer(text[:200], show_alert=True)

    return r
