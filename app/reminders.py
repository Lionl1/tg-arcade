"""Ежедневные напоминания о тренировке дня — в личку игроку, в выбранное им местное время."""

import asyncio
import logging
from html import escape

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramForbiddenError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from .progress import Progress

log = logging.getLogger("arcade.reminders")


def reminder_text(name: str, info: dict) -> str:
    d, s = info["daily"], info["streak"]
    left = len(d["games"]) - d["count"]
    text = f"🧠 {escape(name.split()[0])}, пора на тренировку дня: осталось {left} из {len(d['games'])} игр, это ≈5 минут."
    if s["current"]:
        text += f"\n🔥 Серия: {s['current']} дн. — не прерывай!"
        if s["freezes"]:
            text += f" (в запасе ❄️×{s['freezes']})"
    return text


async def tick(progress: Progress, bot: Bot, webapp_url: str) -> None:
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="▶️ Начать тренировку", web_app=WebAppInfo(url=f"{webapp_url}/hub.html")),
    ]])
    for user_id, name, info in await progress.due_reminders():
        try:
            await bot.send_message(user_id, reminder_text(name, info), reply_markup=kb)
            await progress.mark_reminded(user_id, info["day"])
        except (TelegramForbiddenError, TelegramBadRequest):
            await progress.mark_cant_write(user_id)  # игрок не писал боту / заблокировал / чат не найден — покажем это в профиле
        except TelegramAPIError:
            log.warning("reminder %s: временная ошибка, повторим на следующем тике", user_id)


async def run_reminders(progress: Progress, bot: Bot, webapp_url: str, every: float = 30.0, sharer=None) -> None:
    n = 0
    while True:
        try:
            await tick(progress, bot, webapp_url)
            if sharer and n % 120 == 0:  # примерно раз в час чистим старые картинки
                sharer.cleanup()
        except Exception:
            log.exception("reminders tick")
        n += 1
        await asyncio.sleep(every)
