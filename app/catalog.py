import json
import random
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Game:
    id: str
    title: str
    emoji: str
    section: str
    desc: str
    group: str = ""
    skills: tuple[str, ...] = ()
    par: int = 10  # «хороший» результат на обычной сложности — от него считаются цели уровней
    order: str = "desc"  # desc — больше лучше, asc — меньше лучше (время, ходы)
    format: str = "pts"  # pts | ms | sec (sec хранится в мс)
    unit: str = ""
    ceil: float = 2.5  # «больше — лучше»: к какому множителю par стремится цель бесконечных уровней
    floor: float = 0.65  # «меньше — лучше»: ниже какой доли par цель не опускается
    timed: bool = False  # очки копятся под таймером → цель уровня учитывает, сколько времени дали
    app: bool = False  # не игра, а приложение (рисовалка, жребий, визуализация): без очков и уровней
    title_en: str = ""
    desc_en: str = ""
    unit_en: str = ""
    lang: str = ""  # "" — для всех; "ru" / "en" — только для этого языка интерфейса (контент на одном языке)

    @property
    def asc(self) -> bool:
        return self.order == "asc"

    @property
    def name(self) -> str:
        return f"{self.emoji} {self.title}"

    def t(self, lang: str = "ru") -> str:
        return self.title_en if lang == "en" and self.title_en else self.title

    def d(self, lang: str = "ru") -> str:
        return self.desc_en if lang == "en" and self.desc_en else self.desc

    def label(self, lang: str = "ru") -> str:
        return f"{self.emoji} {self.t(lang)}"

    def visible(self, lang: str | None) -> bool:
        return not lang or not self.lang or self.lang == lang

    def fmt(self, v: int | None, lang: str = "ru") -> str:
        if v is None:
            return "—"
        if self.format == "ms":
            return f"{v} {'ms' if lang == 'en' else 'мс'}"
        if self.format == "sec":
            return f"{v / 1000:.2f} {'s' if lang == 'en' else 'с'}"
        return f"{v} {self.unit_en if lang == 'en' and self.unit_en else self.unit}".strip()


class _Tr:
    def t(self, lang: str = "ru") -> str:
        return getattr(self, "title_en", "") if lang == "en" and getattr(self, "title_en", "") else self.title

    def d(self, lang: str = "ru") -> str:
        return getattr(self, "desc_en", "") if lang == "en" and getattr(self, "desc_en", "") else self.desc


@dataclass(frozen=True)
class Skill(_Tr):
    id: str
    title: str
    desc: str
    title_en: str = ""
    desc_en: str = ""


@dataclass(frozen=True)
class Group(_Tr):
    id: str
    title: str
    title_en: str = ""
    desc: str = ""


@dataclass(frozen=True)
class Section(_Tr):
    id: str
    title: str
    desc: str
    groups: list[Group] = field(default_factory=list)
    title_en: str = ""
    desc_en: str = ""


class Catalog:
    def __init__(self, path: Path):
        data = json.loads(Path(path).read_text("utf-8"))
        self.sections: list[Section] = [
            Section(s["id"], s["title"], s["desc"], [Group(**g) for g in s.get("groups", [])], s.get("title_en", ""), s.get("desc_en", ""))
            for s in data["sections"]
        ]
        self.skills: list[Skill] = [Skill(**s) for s in data.get("skills", [])]
        self.games: dict[str, Game] = {
            g["id"]: Game(**{**g, "skills": tuple(g.get("skills", ()))}) for g in data["games"]
        }

    def __len__(self) -> int:
        return len(self.games)

    def get(self, game_id: str) -> Game | None:
        return self.games.get(game_id)

    def section(self, section_id: str) -> Section | None:
        return next((s for s in self.sections if s.id == section_id), None)

    def list(self, section: str | None = None, group: str | None = None, lang: str | None = None) -> list[Game]:
        """section=None/'all' — все игры; group=None — весь раздел; lang — только игры для этого языка."""
        return [
            g for g in self.games.values()
            if section in (None, "all", g.section) and group in (None, g.group) and g.visible(lang)
        ]

    def count(self, lang: str | None = None) -> int:
        return len(self.list(lang=lang))

    def random(self, lang: str | None = None) -> Game:
        return random.choice(self.list(lang=lang))

    def find(self, query: str, lang: str | None = None) -> Game | None:
        """Поиск по id и названию на любом языке; сначала — игры для языка пользователя."""
        q = query.strip().lower()
        if not q:
            return None
        if q in self.games:
            return self.games[q]
        pool = sorted(self.games.values(), key=lambda g: not g.visible(lang))
        for match in (str.startswith, str.__contains__):
            for g in pool:
                if match(g.title.lower(), q) or (g.title_en and match(g.title_en.lower(), q)):
                    return g
        return None
