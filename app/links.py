from .catalog import Game
from .security import make_ctx, make_event_ctx


class Links:
    """Ссылки t.me/<bot>/<app>?startapp=... на Mini App."""

    def __init__(self, bot_username: str, app_short_name: str, secret: bytes):
        # Пустой short name → главный Mini App бота (BotFather → Bot Settings → Configure Mini App): t.me/<bot>?startapp=
        self.base = f"https://t.me/{bot_username}/{app_short_name}" if app_short_name else f"https://t.me/{bot_username}"
        self.secret = secret

    def play(self, game: Game, chat_id: int) -> str:
        return f"{self.base}?startapp={make_ctx(game.id, chat_id, self.secret)}"

    def event(self, game_id: str, event_id: int) -> str:
        return f"{self.base}?startapp={make_event_ctx(game_id, event_id, self.secret)}"

    def hub(self) -> str:
        """Профиль/хаб: работает и в группах (там нельзя web_app-кнопки)."""
        return f"{self.base}?startapp=hub"
