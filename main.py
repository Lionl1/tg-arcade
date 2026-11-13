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
        await bot.set_my_commands(
            [
                BotCommand(command="profile", description="Профиль, тренировка дня, ачивки"),
                BotCommand(command="games", description="Каталог игр"),
                BotCommand(command="apps", description="Для чата: рисовалка, мемы, жребий, команды"),
                BotCommand(command="algo", description="Алгоритмы и структуры данных с анимацией"),
                BotCommand(command="play", description="Открыть игру: /play змейка"),
                BotCommand(command="tournament", description="Турнир: /tournament змейка 30м"),
                BotCommand(command="duel", description="Дуэль: /duel змейка (ответом — вызвать человека)"),
                BotCommand(command="events", description="Идущие турниры и дуэли"),
                BotCommand(command="top", description="Рекорды чата: /top змейка"),
                BotCommand(command="settings", description="Настройки (в группе — для админов)"),
            ]
        )
        log.info("bot @%s, %d games, mini app %s", me.username, len(catalog), links.base)
    else:
        log.warning("BOT_TOKEN не задан — работает только веб на :%d", settings.port)

    async def on_record(chat_id: int, game: Game, name: str, score: int) -> None:
        if not bot or not (await progress.prefs.chat(chat_id))["record_alerts"]:
            return
        kb = InlineKeyboardMarkup(
            inline_keyboard=[[InlineKeyboardButton(text="⚔️ Побить рекорд", url=links.play(game, chat_id))]]
        )
        await bot.send_message(
            chat_id,
            f"🏆 <b>{escape(name)}</b> — новый рекорд чата в {escape(game.name)}: <b>{game.fmt(score)}</b>",
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
