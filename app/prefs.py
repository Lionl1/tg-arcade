"""Настройки: личные (игрок) и групповые (чат). Описаны декларативно — одно место для умолчаний, допустимых значений и подписей."""

import json
from dataclasses import dataclass

from .db import Store


@dataclass(frozen=True)
class Opt:
    key: str
    title: str
    default: object
    choices: tuple  # допустимые значения
    labels: tuple = ()  # подписи к значениям (для UI)
    hint: str = ""
    group: str = ""


# ---------- личные: применяются в Mini App и на сервере, синхронизируются между устройствами ----------
USER: list[Opt] = [
    Opt("sound", "Звук", True, (True, False), group="🎧 Звук и отклик"),
    Opt("haptics", "Вибрация", True, (True, False), group="🎧 Звук и отклик"),
    Opt("theme", "Тема", "tg", ("tg", "dark", "light"), ("Как в Telegram", "Тёмная", "Светлая"), group="🎨 Вид"),
    Opt("text", "Размер текста", "normal", ("normal", "large"), ("Обычный", "Крупный"), group="🎨 Вид"),
    Opt("motion", "Анимации", True, (True, False), hint="Выключи, если от тряски и вспышек некомфортно", group="🎨 Вид"),
    Opt("open_mode", "При открытии игры", "menu", ("menu", "levels", "free"), ("Показывать меню", "Сразу уровни", "Сразу свободная игра"), group="🎮 Игры"),
    Opt("tips", "Подсказки «как играть»", True, (True, False), group="🎮 Игры"),
    Opt("daily_size", "Игр в тренировке дня", 3, (3, 5), ("3 (≈5 минут)", "5 (≈8 минут)"), hint="Меняется со следующего дня", group="🧠 Тренировка"),
    Opt("learn_batch", "Карточек за подход", 20, (10, 20, 30), ("10", "20", "30"), group="📚 Учёба"),
    Opt("algo_speed", "Скорость анимации алгоритмов", 1, (0, 1, 2, 3), ("×0.5", "×1", "×2", "×5"), group="💻 Алгоритмы"),
    Opt("hide_name", "Скрывать имя в таблицах", False, (False, True), ("Нет", "Да — «Игрок №…»"), hint="Для новых результатов", group="🔒 Приватность"),
]

# ---------- групповые: меняют админы чата командой /settings ----------
CHAT: list[Opt] = [
    Opt("record_alerts", "Объявлять новые рекорды чата", True, (True, False)),
    Opt("tours", "Турниры", True, (True, False)),
    Opt("tour_minutes", "Длительность турнира по умолчанию", 60, (15, 30, 60, 180, 1440), ("15 мин", "30 мин", "1 ч", "3 ч", "1 день")),
    Opt("pin", "Закреплять карточку турнира", True, (True, False)),
    Opt("duels", "Дуэли", True, (True, False)),
    Opt("duel_hours", "Время на дуэль", 24, (6, 12, 24, 48), ("6 ч", "12 ч", "24 ч", "48 ч")),
]

USER_BY_KEY = {o.key: o for o in USER}
CHAT_BY_KEY = {o.key: o for o in CHAT}


def defaults(opts: list[Opt]) -> dict:
    return {o.key: o.default for o in opts}


def clean(opts_by_key: dict[str, Opt], raw: dict) -> dict:
    """Оставить только известные ключи с допустимыми значениями."""
    out = {}
    for k, v in (raw or {}).items():
        o = opts_by_key.get(k)
        if o and v in o.choices and type(v) is type(o.default):
            out[k] = v
    return out


def schema(opts: list[Opt]) -> list[dict]:
    return [{"key": o.key, "title": o.title, "default": o.default, "choices": list(o.choices),
             "labels": list(o.labels) or None, "hint": o.hint, "group": o.group} for o in opts]


class Prefs:
    def __init__(self, store: Store):
        self.store = store

    async def user(self, user_id: int) -> dict:
        row = await self.store._one("SELECT prefs FROM users WHERE user_id=?", (user_id,))
        return {**defaults(USER), **clean(USER_BY_KEY, json.loads(row[0]) if row and row[0] else {})}

    async def set_user(self, user_id: int, changes: dict) -> dict:
        cur = await self.user(user_id)
        cur.update(clean(USER_BY_KEY, changes))
        stored = {k: v for k, v in cur.items() if v != USER_BY_KEY[k].default}
        await self.store._exec("UPDATE users SET prefs=? WHERE user_id=?", (json.dumps(stored), user_id))
        return cur

    async def chat(self, chat_id: int) -> dict:
        row = await self.store._one("SELECT prefs FROM chats WHERE chat_id=?", (chat_id,))
        return {**defaults(CHAT), **clean(CHAT_BY_KEY, json.loads(row[0]) if row else {})}

    async def set_chat(self, chat_id: int, key: str, value) -> dict:
        cur = await self.chat(chat_id)
        cur.update(clean(CHAT_BY_KEY, {key: value}))
        stored = json.dumps({k: v for k, v in cur.items() if v != CHAT_BY_KEY[k].default})
        await self.store._exec(
            "INSERT INTO chats (chat_id, prefs) VALUES (?, ?) ON CONFLICT (chat_id) DO UPDATE SET prefs=excluded.prefs",
            (chat_id, stored),
        )
        return cur

    @staticmethod
    def cycle(opt: Opt, value):
        """Следующее значение по кругу (для кнопок в боте)."""
        i = opt.choices.index(value) if value in opt.choices else -1
        return opt.choices[(i + 1) % len(opt.choices)]
