"""Два языка интерфейса: русский и английский.

Строки пишутся прямо в коде парой: tr(lang, "по-русски", "in English") — перевод рядом с оригиналом,
ничего не теряется при правках. Язык: настройка игрока/чата → language_code из Telegram → русский.
"""

LANGS = ("ru", "en")
# языки, носителям которых привычнее русский интерфейс
RU_LIKE = {"ru", "uk", "be", "kk", "ky", "uz", "tg", "tk", "hy", "az", "ka"}


def norm(lang: str | None) -> str:
    return lang if lang in LANGS else "ru"


def from_code(code: str | None, default: str = "ru") -> str:
    """language_code Telegram (en, ru, pt-br…) → ru | en."""
    if not code:
        return default
    return "ru" if code.lower()[:2] in RU_LIKE else "en"


def pick(pref: str | None, code: str | None, default: str = "ru") -> str:
    """Явная настройка (ru/en) важнее языка Telegram; auto/None — по языку Telegram."""
    return pref if pref in LANGS else from_code(code, default)


def tr(lang: str, ru: str, en: str) -> str:
    return en if lang == "en" else ru
