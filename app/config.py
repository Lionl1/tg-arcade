import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    bot_token: str = field(default_factory=lambda: os.getenv("BOT_TOKEN", ""))
    # Публичный HTTPS-адрес, где лежит web/ (его же указываем в BotFather для Mini App)
    webapp_url: str = field(default_factory=lambda: os.getenv("WEBAPP_URL", "http://localhost:8080").rstrip("/"))
    # short name Mini App из BotFather (/newapp): ссылка t.me/<bot>/<short>?startapp=...
    app_short_name: str = field(default_factory=lambda: os.getenv("APP_SHORT_NAME", "play"))
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8080")))
    db_path: str = field(default_factory=lambda: os.getenv("DB_PATH", str(ROOT / "data" / "arcade.db")))
    # Только для локальной разработки: initData == "dev" → тестовый пользователь (без Telegram)
    dev_auth: bool = field(default_factory=lambda: os.getenv("DEV_AUTH", "") == "1")
    web_dir: Path = ROOT / "web"

    @property
    def ctx_secret(self) -> bytes:
        """Ключ подписи ссылок на игру (game+chat), выводится из токена бота."""
        return hashlib.sha256(b"arcade-ctx:" + (self.bot_token or "dev").encode()).digest()
