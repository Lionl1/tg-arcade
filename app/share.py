"""Приложения для чата: отправка картинок/текста в чат и честный (серверный) жребий."""

import base64
import logging
import os
import re
import secrets
import time
import uuid
from html import escape
from pathlib import Path

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import (
    BufferedInputFile,
    InlineQueryResultArticle,
    InlineQueryResultCachedPhoto,
    InlineQueryResultPhoto,
    InputTextMessageContent,
)

log = logging.getLogger("arcade.share")

MAX_IMAGE = 3 * 1024 * 1024
MAX_UPLOADS_PER_DAY = int(os.getenv("MAX_UPLOADS_PER_DAY", "40"))  # на игрока — чтобы нельзя было забить диск
KEEP_DAYS = int(os.getenv("UPLOADS_KEEP_DAYS", "7"))
MEMBER_TTL = 300  # сек — сколько доверяем проверке «состоит в чате»
USER_GAP = int(os.getenv("GROUP_POST_GAP_SECONDS", "15"))
CHAT_PER_HOUR = int(os.getenv("GROUP_POSTS_PER_HOUR", "30"))  # старые картинки удаляются (ссылки в уже отправленных сообщениях Telegram хранит у себя)
NAME_RE = re.compile(r"^[0-9a-f]{32}\.(png|jpg)$")
SIG = {"png": b"\x89PNG", "jpeg": b"\xff\xd8\xff"}
SR = secrets.SystemRandom()


class ShareError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


class Sharer:
    def __init__(self, uploads: Path, webapp_url: str, bot: Bot | None = None):
        self.uploads, self.webapp_url, self.bot = uploads, webapp_url.rstrip("/"), bot
        self.uploads.mkdir(parents=True, exist_ok=True)
        self._uploads: dict[tuple[int, str], int] = {}
        self._members: dict[tuple[int, int], tuple[bool, float]] = {}  # (чат, игрок) → (участник?, когда проверяли)
        self._last_post: dict[tuple[int, int], float] = {}
        self._chat_posts: dict[int, list[float]] = {}

    # ---------- защита групп от спама через бота ----------

    async def guard(self, chat_id: int, user_id: int) -> None:
        """Публиковать в группу может только её участник, не чаще раза в USER_GAP с и не больше CHAT_PER_HOUR постов в час на чат."""
        if chat_id >= 0 or not self.bot:
            return  # личка игрока — без ограничений, кроме общего throttle
        now = time.monotonic()
        ok, at = self._members.get((chat_id, user_id), (False, 0.0))
        if now - at > MEMBER_TTL:
            try:
                m = await self.bot.get_chat_member(chat_id, user_id)
                ok = m.status in ("creator", "administrator", "member") or (m.status == "restricted" and getattr(m, "is_member", False))
            except TelegramAPIError:
                ok = False
            self._members[(chat_id, user_id)] = (ok, now)
        if not ok:
            raise ShareError(403, "Публиковать в группу могут только её участники")
        if now - self._last_post.get((chat_id, user_id), -1e9) < USER_GAP:
            raise ShareError(429, f"Не чаще раза в {USER_GAP} секунд — дай чату передохнуть")
        recent = [t for t in self._chat_posts.get(chat_id, []) if now - t < 3600]
        if len(recent) >= CHAT_PER_HOUR:
            raise ShareError(429, "В этот чат уже много отправлено за час — попробуй позже")
        recent.append(now)
        self._chat_posts[chat_id] = recent
        self._last_post[(chat_id, user_id)] = now

    # ---------- картинки ----------

    def save_image(self, data_url: str, user_id: int) -> tuple[str, bytes]:
        """PNG (для файла) или JPEG (для пересылки: Telegram принимает в inline-фото только JPEG)."""
        m = re.match(r"^data:image/(png|jpeg);base64,(.+)$", data_url or "", re.S)
        if not m:
            raise ShareError(400, "Нужна картинка PNG или JPEG")
        kind, raw = m.group(1), base64.b64decode(m.group(2), validate=False)
        if len(raw) > MAX_IMAGE or not raw.startswith(SIG[kind]):
            raise ShareError(400, "Картинка слишком большая или повреждена")
        day = time.strftime("%Y%m%d")
        if self._uploads.get((user_id, day), 0) >= MAX_UPLOADS_PER_DAY:
            raise ShareError(429, "На сегодня лимит картинок исчерпан")
        self._uploads[(user_id, day)] = self._uploads.get((user_id, day), 0) + 1
        name = f"{uuid.uuid4().hex}.{'png' if kind == 'png' else 'jpg'}"
        (self.uploads / name).write_bytes(raw)
        return name, raw

    def cleanup(self) -> int:
        """Удалить загрузки старше KEEP_DAYS и забыть вчерашние счётчики."""
        cutoff, n = time.time() - KEEP_DAYS * 86400, 0
        for p in self.uploads.glob("*.*"):
            if p.stat().st_mtime < cutoff:
                p.unlink(missing_ok=True)
                n += 1
        day = time.strftime("%Y%m%d")
        self._uploads = {k: v for k, v in self._uploads.items() if k[1] == day}
        return n

    def file(self, name: str) -> Path | None:
        if not NAME_RE.match(name):
            return None
        p = self.uploads / name
        return p if p.exists() else None

    def url(self, name: str) -> str:
        return f"{self.webapp_url}/u/{name}"

    @staticmethod
    def _file(raw: bytes) -> BufferedInputFile:
        return BufferedInputFile(raw, "picture.jpg" if raw.startswith(SIG["jpeg"]) else "picture.png")

    async def send_photo(self, chat_id: int, raw: bytes, caption: str, user_id: int) -> bool:
        if not self.bot:
            return False
        await self.guard(chat_id, user_id)
        try:
            msg = await self.bot.send_photo(chat_id, self._file(raw), caption=caption)
            p = msg.photo[-1] if msg.photo else None
            log.info("share: фото в чат %s, %d байт → %sx%s", chat_id, len(raw), p and p.width, p and p.height)
            return True
        except TelegramAPIError as e:
            log.warning("send_photo %s: %s", chat_id, e)
            raise ShareError(403, "Бот не может написать в этот чат. В личке нажми «Старт» у бота.")

    async def upload_file_id(self, user_id: int, raw: bytes) -> str | None:
        """Загружаем картинку в сам Telegram (в личку игроку, тихо, и сразу удаляем сообщение) → file_id.
        С file_id пересылка не зависит от того, успеет ли Telegram скачать картинку с нашего сервера по ссылке."""
        try:
            msg = await self.bot.send_photo(user_id, self._file(raw), disable_notification=True)
            file_id = msg.photo[-1].file_id
            try:
                await self.bot.delete_message(user_id, msg.message_id)
            except TelegramAPIError:
                pass
            return file_id
        except TelegramAPIError as e:
            log.info("upload_file_id %s: %s — пробую по ссылке", user_id, e)
            return None

    async def send_text(self, chat_id: int, html: str, user_id: int) -> bool:
        if not self.bot:
            return False
        await self.guard(chat_id, user_id)
        try:
            await self.bot.send_message(chat_id, html)
            return True
        except TelegramAPIError as e:
            log.warning("send_text %s: %s", chat_id, e)
            raise ShareError(403, "Бот не может написать в этот чат. В личке нажми «Старт» у бота.")

    async def prepare(self, user_id: int, *, photo_name: str | None = None, raw: bytes | None = None, text: str | None = None) -> str | None:
        """Подготовленное сообщение для Telegram.WebApp.shareMessage — пользователь сам выберет любой чат."""
        if not self.bot:
            return None
        rid = uuid.uuid4().hex[:16]
        if photo_name:
            file_id = await self.upload_file_id(user_id, raw) if raw else None
            if file_id:
                result = InlineQueryResultCachedPhoto(id=rid, photo_file_id=file_id)
            elif self.webapp_url.startswith("https://"):
                url = self.url(photo_name)  # запасной путь: Telegram сам скачает по ссылке
                result = InlineQueryResultPhoto(id=rid, photo_url=url, thumbnail_url=url)
            else:
                return None
        else:
            result = InlineQueryResultArticle(id=rid, title="Результат", input_message_content=InputTextMessageContent(message_text=text))
        try:
            msg = await self.bot.save_prepared_inline_message(
                user_id=user_id, result=result, allow_user_chats=True, allow_bot_chats=True,
                allow_group_chats=True, allow_channel_chats=True,
            )
            log.info("share: подготовлено сообщение для %s (%s)", user_id, type(result).__name__)
            return msg.id
        except (TelegramAPIError, AttributeError) as e:
            log.info("prepared message unavailable: %s", e)
            return None

    # ---------- честный жребий ----------

    @staticmethod
    def roll(kind: str, *, n: int = 1, sides: int = 6, lo: int = 1, hi: int = 100,
             items: list[str] | None = None, teams: int = 2) -> dict:
        items = [i.strip()[:60] for i in (items or []) if i.strip()][:50]
        if kind == "dice":
            n, sides = max(1, min(n, 10)), max(2, min(sides, 100))
            vals = [SR.randint(1, sides) for _ in range(n)]
            return {"kind": kind, "values": vals, "total": sum(vals), "text": f"🎲 {n}d{sides}: {' + '.join(map(str, vals))}" + (f" = <b>{sum(vals)}</b>" if n > 1 else "")}
        if kind == "coin":
            v = SR.choice(["Орёл", "Решка"])
            return {"kind": kind, "value": v, "text": f"🪙 Монетка: <b>{v}</b>"}
        if kind == "number":
            lo, hi = sorted((max(-10**9, lo), min(10**9, hi)))
            v = SR.randint(lo, hi)
            return {"kind": kind, "value": v, "text": f"🔢 Случайное число от {lo} до {hi}: <b>{v}</b>"}
        if kind == "pick":
            if len(items) < 2:
                raise ShareError(400, "Нужно хотя бы 2 варианта")
            i = SR.randrange(len(items))
            return {"kind": kind, "index": i, "value": items[i], "text": f"🎡 Колесо выбрало: <b>{escape(items[i])}</b>\n<i>из: {escape(', '.join(items))}</i>"}
        if kind == "teams":
            if len(items) < 2:
                raise ShareError(400, "Нужно хотя бы 2 участника")
            teams = max(2, min(teams, len(items)))
            order = items[:]
            SR.shuffle(order)
            out = [order[k::teams] for k in range(teams)]
            lines = [f"<b>Команда {k + 1}:</b> {escape(', '.join(t))}" for k, t in enumerate(out)]
            return {"kind": kind, "teams": out, "text": "👥 Команды:\n" + "\n".join(lines)}
        raise ShareError(400, "Неизвестный жребий")
