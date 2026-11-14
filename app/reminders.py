"""Ежедневные напоминания о тренировке дня — в личку игроку, в выбранное им местное время."""

import asyncio
import logging
from html import escape

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramForbiddenError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from .i18n import tr
from .progress import Progress

log = logging.getLogger("arcade.reminders")


def reminder_text(name: str, info: dict) -> str:
    d, s, L = info["daily"], info["streak"], info.get("lang", "ru")
    left, total, who = len(d["games"]) - d["count"], len(d["games"]), escape(name.split()[0])
    text = tr(L, f"🧠 {who}, пора на тренировку дня: осталось {left} из {total} игр, это ≈5 минут.",
              f"🧠 {who}, time for your daily workout: {left} of {total} games left, about 5 minutes.")
    if s["current"]:
        text += tr(L, f"\n🔥 Серия: {s['current']} дн. — не прерывай!", f"\n🔥 Streak: {s['current']} days — don't break it!")
        if s["freezes"]:
            text += tr(L, f" (в запасе ❄️×{s['freezes']})", f" (❄️×{s['freezes']} in reserve)")
    return text


async def tick(progress: Progress, bot: Bot, webapp_url: str) -> None:
    def kb(lang: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
            text=tr(lang, "▶️ Начать тренировку", "▶️ Start the workout"), web_app=WebAppInfo(url=f"{webapp_url}/hub.html"))]])

    for user_id, name, info in await progress.due_reminders():
        try:
            await bot.send_message(user_id, reminder_text(name, info), reply_markup=kb(info.get("lang", "ru")))
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
