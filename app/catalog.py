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

    @property
    def asc(self) -> bool:
        return self.order == "asc"

    @property
    def name(self) -> str:
        return f"{self.emoji} {self.title}"

    def fmt(self, v: int | None) -> str:
        if v is None:
            return "—"
        if self.format == "ms":
            return f"{v} мс"
        if self.format == "sec":
            return f"{v / 1000:.2f} с"
        return f"{v} {self.unit}".strip()


@dataclass(frozen=True)
class Skill:
    id: str
    title: str
    desc: str


@dataclass(frozen=True)
class Group:
    id: str
    title: str


@dataclass(frozen=True)
class Section:
    id: str
    title: str
    desc: str
    groups: list[Group] = field(default_factory=list)


class Catalog:
    def __init__(self, path: Path):
        data = json.loads(Path(path).read_text("utf-8"))
        self.sections: list[Section] = [
            Section(s["id"], s["title"], s["desc"], [Group(**g) for g in s.get("groups", [])]) for s in data["sections"]
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

    def list(self, section: str | None = None, group: str | None = None) -> list[Game]:
        """section=None/'all' — все игры; group=None — весь раздел."""
        return [
            g for g in self.games.values()
            if section in (None, "all", g.section) and group in (None, g.group)
        ]

    def random(self) -> Game:
        return random.choice(list(self.games.values()))

    def find(self, query: str) -> Game | None:
        q = query.strip().lower()
        if not q:
            return None
        if q in self.games:
            return self.games[q]
        for match in (str.startswith, str.__contains__):
            for g in self.games.values():
                if match(g.title.lower(), q):
                    return g
        return None
