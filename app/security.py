"""Проверка initData из Telegram Mini App и подписанные ссылки «игра + чат»."""

import hashlib
import hmac
import json
import re
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

GAME_RE = re.compile(r"^[a-z0-9-]{1,32}$")


def validate_init_data(init_data: str, bot_token: str, max_age: int = 24 * 3600, now: float | None = None) -> dict | None:
    """Возвращает {"user", "start_param", "auth_date"} или None, если подпись неверна/устарела.

    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not init_data or not bot_token:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    except ValueError:
        return None
    received = pairs.pop("hash", None)
    if not received:
        return None
    check = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received):
        return None
    try:
        auth_date = int(pairs.get("auth_date", "0"))
        user = json.loads(pairs.get("user", "null"))
    except ValueError:
        return None
    if max_age and (now if now is not None else time.time()) - auth_date > max_age:
        return None
    if not isinstance(user, dict) or not isinstance(user.get("id"), int):
        return None
    return {"user": user, "start_param": pairs.get("start_param"), "auth_date": auth_date}


@dataclass(frozen=True)
class Ctx:
    game: str
    chat_id: int | None = None  # обычная игра в чате
    event_id: int | None = None  # турнир или дуэль


def _sig(secret: bytes, game: str, subject: str) -> str:
    return hmac.new(secret, f"{game}:{subject}".encode(), hashlib.sha256).hexdigest()[:12]


def make_ctx(game: str, chat_id: int, secret: bytes) -> str:
    """startapp-параметр: только [A-Za-z0-9_-], до 512 символов."""
    chat = f"m{-chat_id}" if chat_id < 0 else str(chat_id)
    return f"{game}_{chat}_{_sig(secret, game, str(chat_id))}"


def make_event_ctx(game: str, event_id: int, secret: bytes) -> str:
    return f"{game}_e{event_id}_{_sig(secret, game, f'e{event_id}')}"


def parse_ctx(ctx: str, secret: bytes) -> Ctx | None:
    """Подписанная ссылка → Ctx; голый id игры → Ctx(game); подделка → None."""
    parts = (ctx or "").split("_")
    if len(parts) == 1:
        return Ctx(parts[0]) if GAME_RE.match(parts[0]) else None
    if len(parts) != 3:
        return None
    game, subj, sig = parts
    if not GAME_RE.match(game):
        return None
    try:
        if subj.startswith("e"):
            event_id, chat_id, subject = int(subj[1:]), None, f"e{int(subj[1:])}"
        else:
            event_id, chat_id = None, -int(subj[1:]) if subj.startswith("m") else int(subj)
            subject = str(chat_id)
    except ValueError:
        return None
    if not hmac.compare_digest(sig, _sig(secret, game, subject)):
        return None
    return Ctx(game, chat_id, event_id)
