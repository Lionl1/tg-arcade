"""Запуск: веб-сервер (игры + API) и бот в одном процессе.

Без BOT_TOKEN поднимается только веб — удобно гонять игры локально: http://localhost:8080
"""

import asyncio
import logging
from pathlib import Path
from html import escape

import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.types import BotCommand, InlineKeyboardButton, InlineKeyboardMarkup

from app.bot import build_router
from app.i18n import LANGS, RU_LIKE, tr
from app.catalog import Catalog, Game
from app.config import Settings
from app.db import Store
from app.events import Events
from app.links import Links
from app.progress import Progress
from app.reminders import run_reminders
from app.share import Sharer
from app.web import create_app

log = logging.getLogger("arcade")


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = Settings()
    catalog = Catalog(settings.web_dir / "games" / "catalog.json")
    store = Store(settings.db_path)
    bot = dp = links = None

    if settings.bot_token:
        bot = Bot(settings.bot_token, default=DefaultBotProperties(parse_mode="HTML"))
        me = await bot.get_me()
        links = Links(me.username, settings.app_short_name, settings.ctx_secret)
    progress = Progress(store, catalog)
    events = Events(store, catalog, links, bot, progress)

    if bot:
        dp = Dispatcher()
        dp.include_router(build_router(store, catalog, links, events, settings.webapp_url))
        # меню команд: английское по умолчанию, русское — для русскоязычных клиентов Telegram
        cmds = {
            "en": [("profile", "Profile, daily workout, achievements"), ("games", "Game catalog"), ("paths", "Paths through sections towards a goal"), ("week", "Your week: activity, XP, pillars"),
                   ("apps", "For chats: drawing, memes, draws, teams"), ("algo", "Algorithms and data structures, animated"),
                   ("play", "Open a game: /play snake"), ("tournament", "Tournament: /tournament snake 30m"),
                   ("duel", "Duel: /duel snake (as a reply — challenge that person)"), ("events", "Running tournaments and duels"),
                   ("top", "Chat records: /top snake"), ("settings", "Settings (admins only in groups)")],
            "ru": [("profile", "Профиль, тренировка дня, ачивки"), ("games", "Каталог игр"), ("paths", "Пути через разделы к цели"), ("week", "Твоя неделя: активность, опыт, опоры"),
                   ("apps", "Для чата: рисовалка, мемы, жребий, команды"), ("algo", "Алгоритмы и структуры данных с анимацией"),
                   ("play", "Открыть игру: /play змейка"), ("tournament", "Турнир: /tournament змейка 30м"),
                   ("duel", "Дуэль: /duel змейка (ответом — вызвать человека)"), ("events", "Идущие турниры и дуэли"),
                   ("top", "Рекорды чата: /top змейка"), ("settings", "Настройки (в группе — для админов)")],
        }
        as_cmds = lambda lang: [BotCommand(command=c, description=d) for c, d in cmds[lang]]  # noqa: E731
        await bot.set_my_commands(as_cmds("en"))
        for code in sorted(RU_LIKE):
            await bot.set_my_commands(as_cmds("ru"), language_code=code)
        log.info("bot @%s, %d games, mini app %s", me.username, len(catalog), links.base)
    else:
        log.warning("BOT_TOKEN не задан — работает только веб на :%d", settings.port)

    async def on_record(chat_id: int, game: Game, name: str, score: int, lang: str = "ru") -> None:
        cp = await progress.prefs.chat(chat_id)
        if not bot or not cp["record_alerts"]:
            return
        L = cp["lang"] if cp["lang"] in LANGS else lang
        kb = InlineKeyboardMarkup(
            inline_keyboard=[[InlineKeyboardButton(text=tr(L, "⚔️ Побить рекорд", "⚔️ Beat the record"), url=links.play(game, chat_id))]]
        )
        G, S = escape(game.label(L)), game.fmt(score, L)
        await bot.send_message(
            chat_id,
            tr(L, f"🏆 <b>{escape(name)}</b> — новый рекорд чата в {G}: <b>{S}</b>", f"🏆 <b>{escape(name)}</b> set a new chat record in {G}: <b>{S}</b>"),
            reply_markup=kb,
        )

    sharer = Sharer(Path(settings.db_path).parent / "uploads", settings.webapp_url, bot)
    app = create_app(settings, store, catalog, on_record, events, progress, sharer)
    server = uvicorn.Server(uvicorn.Config(app, host=settings.host, port=settings.port, log_level="info"))

    polling = asyncio.create_task(dp.start_polling(bot, handle_signals=False)) if dp else None
    ticker = asyncio.create_task(events.run())  # итоги турниров и просроченных дуэлей
    reminders = asyncio.create_task(run_reminders(progress, bot, settings.webapp_url, sharer=sharer)) if bot else None
    try:
        await server.serve()
    finally:
        ticker.cancel()
        if reminders:
            reminders.cancel()
        if polling:
            try:
                await dp.stop_polling()
            except RuntimeError:
                pass
            polling.cancel()
            await asyncio.gather(polling, return_exceptions=True)
            await bot.session.close()
        await store.close()


if __name__ == "__main__":
    asyncio.run(main())
