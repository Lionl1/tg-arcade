"""Прогрессия игрока: опыт, уровни игры (12 на каждую игру), навыки, тренировка дня, серия, ачивки, напоминания.

Принципы — из docs/research.md: разнообразие навыков, короткие ежедневные сессии,
сложность на грани возможностей, честные формулировки без медицинских обещаний.
"""

import hashlib
import math
import re
import json
import random
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from .catalog import Catalog, Game
from .db import Store
from .prefs import USER, Prefs, schema

AVATARS = ["🦊", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐶", "🐱", "🐰", "🦉", "🐧", "🐙", "🦄", "🐲", "🦖", "🐢", "🐬",
           "🦋", "🐝", "🌵", "🍀", "🌸", "🔥", "⚡", "🌙", "⭐", "🚀", "🎯", "🎸", "🎨", "🧠", "🤖", "👾", "👽", "🥷", "🧙", "🦸"]
NICK_RE = re.compile(r"^[\w .\-]{2,20}$")


def clean_nickname(raw: str | None) -> str | None:
    """Ник 2–20 символов: буквы, цифры, пробел, точка, дефис, подчёркивание. Пусто — вернуть имя из Telegram."""
    if raw is None:
        return None
    nick = " ".join(raw.split())
    if not nick:
        return None
    if not NICK_RE.match(nick) or nick.lower().startswith("игрок №") or "http" in nick.lower():
        raise ValueError("Ник: 2–20 символов, буквы, цифры, пробел, точка, дефис или _")
    return nick


LEVELS = 12  # уровней на «странице»; сами уровни бесконечные
MAX_LEVEL = 9999
DIFFS = ["Лёгкая", "Обычная", "Сложная", "Экстрим"]
# навыки для «тренировки дня» (аркадную координацию и факты-знания не навязываем)
COGNITIVE = ["speed", "attention", "memory", "flex", "logic", "spatial", "math", "language"]
ACH_XP = 25
TITLES = [(1, "Новичок"), (3, "Любопытный"), (5, "Ученик"), (8, "Знаток"), (12, "Мыслитель"),
          (16, "Мастер"), (20, "Гроссмейстер"), (30, "Легенда")]


# ---------- уровни внутри игры ----------

def time_factor(k: int) -> float:
    """Сколько времени таймера даёт уровень k (как timeOf в SDK)."""
    return max(0.6, 1.25 - 0.4 * min(1, (k - 1) / 11) - 0.01 * max(0, k - 12))


def level_factor(game: Game, k: int) -> float:
    """Множитель к par для уровня k (бесконечные уровни).
    «Больше — лучше»: от 0.35 плавно растёт к потолку игры (ceil, по умолчанию 2.5; для игр с физическим пределом — меньше),
    а если очки копятся под таймером — умножается на долю времени, которую даёт уровень.
    «Меньше — лучше» (время, ходы): от 2.0 плавно идёт к floor·par и никогда его не переходит."""
    if game.asc:
        return game.floor + (2.0 - game.floor) * 0.82 ** (k - 1)
    f = game.ceil - (game.ceil - 0.35) * 0.88 ** (k - 1)
    return f * time_factor(k) if game.timed else f


def level_goal(game: Game, k: int) -> int:
    return max(1, math.floor(game.par * level_factor(game, k) + 0.5))  # округление как Math.round в SDK


def level_stars(game: Game, k: int, score: int) -> int:
    g = level_goal(game, k)
    if game.asc:
        return sum(score <= t for t in (g, g * 0.85, g * 0.7))
    return sum(score >= t for t in (g, g * 1.25, g * 1.5))


def level_difficulty(k: int) -> int:
    return 0 if k <= 3 else 1 if k <= 8 else 2 if k <= 20 else 3


# ---------- опыт и уровни ----------

def level_from_xp(xp: int, step: int) -> tuple[int, int, int]:
    """(уровень, xp начала уровня, xp следующего) при пороге step·n·(n−1)."""
    n = 1
    while step * (n + 1) * n <= xp:
        n += 1
    return n, step * n * (n - 1), step * (n + 1) * n


def title_for(level: int) -> str:
    return [t for lv, t in TITLES if level >= lv][-1]


def local_now(tz: int, now: float | None = None) -> datetime:
    return datetime.fromtimestamp(now if now is not None else time.time(), timezone.utc) - timedelta(minutes=tz)


# ---------- ачивки ----------

@dataclass(frozen=True)
class Ach:
    code: str
    emoji: str
    title: str
    desc: str
    key: str  # какая метрика из stats
    goal: int


ACHIEVEMENTS: list[Ach] = [
    Ach("first", "👣", "Первый шаг", "Сыграй первую игру", "plays", 1),
    Ach("plays10", "🔥", "Разогрев", "Сыграй 10 партий", "plays", 10),
    Ach("plays100", "🏃", "Завсегдатай", "Сыграй 100 партий", "plays", 100),
    Ach("plays500", "🦾", "Ветеран", "Сыграй 500 партий", "plays", 500),
    Ach("variety10", "🎨", "Разносторонний", "Попробуй 10 разных игр", "games", 10),
    Ach("variety30", "🧳", "Коллекционер", "Попробуй 30 разных игр", "games", 30),
    Ach("sections", "🧭", "Исследователь", "Сыграй во всех разделах", "sections", 3),
    Ach("daily1", "📅", "Первая тренировка", "Заверши тренировку дня", "daily", 1),
    Ach("daily30", "🗓", "Тридцать тренировок", "Заверши 30 тренировок дня", "daily", 30),
    Ach("streak3", "✨", "Три дня подряд", "Серия тренировок 3 дня", "best_streak", 3),
    Ach("streak7", "🌟", "Неделя", "Серия тренировок 7 дней", "best_streak", 7),
    Ach("streak30", "💎", "Железная воля", "Серия тренировок 30 дней", "best_streak", 30),
    Ach("lvl5", "🎓", "Ученик", "Достигни 5-го уровня профиля", "level", 5),
    Ach("lvl10", "🧠", "Мыслитель", "Достигни 10-го уровня профиля", "level", 10),
    Ach("lvl20", "👑", "Гроссмейстер", "Достигни 20-го уровня профиля", "level", 20),
    Ach("skill5", "🔬", "Специалист", "Прокачай любой навык до 5", "max_skill", 5),
    Ach("harmony", "☯️", "Гармония", "Все 8 когнитивных навыков — уровень 3+", "min_cog_skill", 3),
    Ach("records10", "📈", "Рекордсмен", "Обнови личный рекорд 10 раз", "records", 10),
    Ach("stars30", "⭐", "Звездочёт", "Собери 30 звёзд на уровнях", "stars", 30),
    Ach("stars150", "🌌", "Созвездие", "Собери 150 звёзд", "stars", 150),
    Ach("perfect10", "💯", "Перфекционист", "10 уровней на 3 звезды", "three_star", 10),
    Ach("level12", "🏔", "Покоритель", "Пройди 12-й уровень в любой игре", "max_level", 12),
    Ach("level30", "♾️", "Бесконечность", "Пройди 30-й уровень в любой игре", "max_level", 30),
    Ach("tour_win", "🏆", "Чемпион", "Победи в турнире чата", "tour_win", 1),
    Ach("duel_win", "⚔️", "Дуэлянт", "Выиграй дуэль", "duel_win", 1),
    Ach("early", "🌅", "Ранняя пташка", "Потренируйся до 8 утра", "early", 1),
    Ach("night", "🦉", "Сова", "Потренируйся после 23:00", "night", 1),
    Ach("comeback", "🔁", "Возвращение", "Вернись после перерыва в неделю", "comeback", 1),
]
ACH_BY_CODE = {a.code: a for a in ACHIEVEMENTS}


class Progress:
    def __init__(self, store: Store, catalog: Catalog):
        self.store, self.catalog = store, catalog
        self.prefs = Prefs(store)

    async def table_name(self, user_id: int, name: str) -> str:
        """Имя для таблиц и сообщений в чат: «Игрок №…» (приватность), свой ник или имя из Telegram — с эмодзи-аватаром."""
        p = await self.prefs.user(user_id)
        if p["hide_name"]:
            return f"Игрок №{str(user_id)[-4:]}"
        row = await self.store._one("SELECT nickname, avatar FROM users WHERE user_id=?", (user_id,))
        nick, avatar = (row or (None, None))
        base = nick or name
        return f"{avatar} {base}" if avatar else base

    async def set_identity(self, user_id: int, name: str, tz: int | None, nickname: str | None, avatar: str | None) -> dict:
        await self.touch_user(user_id, name, tz)
        nick = clean_nickname(nickname)
        if avatar is not None and avatar not in AVATARS and avatar != "":
            raise ValueError("Такой аватарки нет")
        await self.store._exec("UPDATE users SET nickname=?, avatar=? WHERE user_id=?", (nick, avatar or None, user_id))
        return {"nickname": nick, "avatar": avatar or None}

    # ---------- пользователь ----------

    async def touch_user(self, user_id: int, name: str, tz: int | None) -> int:
        """Создать/обновить игрока (часовой пояс и имя из Telegram); вернуть часовой пояс.
        name — всегда настоящее имя из Telegram, не «табличное» (ник/аватар/«Игрок №»)."""
        tz = tz if tz is not None and -840 <= tz <= 720 else None
        row = await self.store._one("SELECT tz, name FROM users WHERE user_id=?", (user_id,))
        if row is None:
            await self.store._exec(
                "INSERT OR IGNORE INTO users (user_id, name, tz, created) VALUES (?, ?, ?, ?)",
                (user_id, name, tz if tz is not None else -180, int(time.time())),
            )
            return tz if tz is not None else -180
        new_tz = tz if tz is not None else row[0]
        if new_tz != row[0] or name != row[1]:
            await self.store._exec("UPDATE users SET tz=?, name=? WHERE user_id=?", (new_tz, name, user_id))
        return new_tz

    # ---------- опыт ----------

    async def total_xp(self, user_id: int) -> int:
        (xp,) = await self.store._one(
            "SELECT (SELECT COALESCE(SUM(xp), 0) FROM plays WHERE user_id=?) + ? * (SELECT COUNT(*) FROM achievements WHERE user_id=?)",
            (user_id, ACH_XP, user_id),
        )
        return xp

    def _skills_from(self, per_game: dict[str, float]) -> dict[str, float]:
        out = {s.id: 0.0 for s in self.catalog.skills}
        for game_id, xp in per_game.items():
            g = self.catalog.get(game_id)
            if g and g.skills:
                for s in g.skills:
                    out[s] = out.get(s, 0) + xp / len(g.skills)
        return out

    async def _xp_per_game(self, user_id: int) -> dict[str, float]:
        return dict(await self.store._all("SELECT game, SUM(xp) FROM plays WHERE user_id=? GROUP BY game", (user_id,)))

    async def skill_xp(self, user_id: int) -> dict[str, float]:
        return self._skills_from(await self._xp_per_game(user_id))

    # ---------- уровни игры ----------

    async def game_levels(self, user_id: int, game: Game) -> dict:
        rows = {lv: (st, best) for lv, st, best in await self.store._all(
            "SELECT level, stars, best FROM levels WHERE user_id=? AND game=?", (user_id, game.id))}
        unlocked = 1
        while unlocked < MAX_LEVEL and rows.get(unlocked, (0, 0))[0] > 0:
            unlocked += 1
        last = -(-unlocked // LEVELS) * LEVELS  # до конца «страницы» с последним открытым уровнем
        return {
            "unlocked": unlocked,
            "levels": [
                {"n": k, "goal": level_goal(game, k), "diff": level_difficulty(k),
                 "stars": rows.get(k, (0, None))[0], "best": rows.get(k, (0, None))[1]}
                for k in range(1, last + 1)
            ],
        }

    # ---------- тренировка дня и серия ----------

    async def daily(self, user_id: int, day: str) -> list[str]:
        row = await self.store._one("SELECT games FROM daily WHERE user_id=? AND day=?", (user_id, day))
        if row:
            return json.loads(row[0])
        skills = await self.skill_xp(user_id)
        rnd = random.Random(int(hashlib.sha256(f"{user_id}:{day}".encode()).hexdigest()[:12], 16))
        # 1) всегда скорость или внимание (ACTIVE), 2–3) самые слабые из остальных, с долей случайности
        first = min(["speed", "attention"], key=lambda s: (skills.get(s, 0), rnd.random()))
        rest = sorted((s for s in COGNITIVE if s != first), key=lambda s: (skills.get(s, 0), rnd.random()))
        size = (await self.prefs.user(user_id))["daily_size"]
        # тренировка мозга: скорость/внимание + самые слабые навыки; последней — учёба (вспоминание = лучшая доказанная техника)
        picked = [first] + rnd.sample(rest[: max(4, size)], size - 2)
        games: list[str] = []
        for s in picked:
            pool = [g.id for g in self.catalog.games.values() if s in g.skills and g.id not in games and g.section == "brain"]
            if pool:
                games.append(rnd.choice(sorted(pool)))
        study = [g.id for g in self.catalog.games.values() if g.section in ("ege", "learn") and not g.app and g.id not in games]
        if study:
            games.append(rnd.choice(sorted(study)))
        await self.store._exec("INSERT OR IGNORE INTO daily (user_id, day, games) VALUES (?, ?, ?)", (user_id, day, json.dumps(games)))
        return json.loads((await self.store._one("SELECT games FROM daily WHERE user_id=? AND day=?", (user_id, day)))[0])

    async def _played_today(self, user_id: int, day: str) -> dict[str, int]:
        """{игра: сколько партий сегодня} — одним запросом (и для тренировки дня, и для убывания опыта)."""
        return dict(await self.store._all("SELECT game, COUNT(*) FROM plays WHERE user_id=? AND day=? GROUP BY game", (user_id, day)))

    async def daily_state(self, user_id: int, day: str, played: set[str] | None = None, games: list[str] | None = None) -> dict:
        games = games if games is not None else await self.daily(user_id, day)
        if played is None:
            played = set(await self._played_today(user_id, day))
        items = [{"id": g, "done": g in played} for g in games]
        done = all(i["done"] for i in items)
        if done:
            await self.store._exec("UPDATE daily SET done=1 WHERE user_id=? AND day=? AND done=0", (user_id, day))
        return {"games": items, "done": done, "count": sum(i["done"] for i in items)}

    async def _done_days(self, user_id: int) -> list[date]:
        return [date.fromisoformat(d) for (d,) in await self.store._all(
            "SELECT day FROM daily WHERE user_id=? AND done=1 ORDER BY day", (user_id,))]

    async def streak(self, user_id: int, today: str, days: list[date] | None = None) -> dict:
        """Серия по дням с завершённой тренировкой. Каждые 7 дней серии — «заморозка» (максимум 2), она прикрывает один пропуск."""
        days = days if days is not None else await self._done_days(user_id)
        streak = best = freezes = 0
        prev = None
        for d in days:
            gap = (d - prev).days if prev else 1
            if gap == 1:
                streak += 1
            elif gap == 2 and freezes > 0:
                freezes -= 1
                streak += 1
            else:
                streak, freezes = 1, 0
            if streak % 7 == 0:
                freezes = min(2, freezes + 1)
            best = max(best, streak)
            prev = d
        t = date.fromisoformat(today)
        current = 0
        if prev:
            gap = (t - prev).days
            if gap <= 1 or (gap == 2 and freezes > 0):
                current = streak
        return {"current": current, "best": best, "freezes": freezes, "today": bool(prev and prev == t), "count": len(days)}

    # ---------- статистика и ачивки ----------

    async def stats(self, user_id: int, today: str) -> dict:
        """Всё для ачивок и профиля — за 6 запросов (раньше было ~16)."""
        plays, records, early, night = await self.store._one(
            "SELECT COUNT(*), COALESCE(SUM(record), 0), COALESCE(MAX(hour < 8), 0), COALESCE(MAX(hour >= 23), 0) FROM plays WHERE user_id=?",
            (user_id,))
        per_game = await self._xp_per_game(user_id)
        stars, three, max_level = await self.store._one(
            "SELECT COALESCE(SUM(stars), 0), COALESCE(SUM(stars = 3), 0), COALESCE(MAX(CASE WHEN stars > 0 THEN level END), 0) FROM levels WHERE user_id=?",
            (user_id,))
        done_days = await self._done_days(user_id)
        days = [date.fromisoformat(d) for (d,) in await self.store._all(
            "SELECT DISTINCT day FROM plays WHERE user_id=? ORDER BY day", (user_id,))]
        have = {c for (c,) in await self.store._all("SELECT code FROM achievements WHERE user_id=?", (user_id,))}
        total = round(sum(per_game.values())) + ACH_XP * len(have)
        sk_lv = {s: level_from_xp(int(x), 15)[0] for s, x in self._skills_from(per_game).items()}
        sections = {self.catalog.get(g).section for g in per_game if self.catalog.get(g)}
        return {
            "plays": plays, "games": len(per_game), "sections": len(sections), "daily": len(done_days),
            "best_streak": (await self.streak(user_id, today, done_days))["best"], "level": level_from_xp(total, 25)[0],
            "max_skill": max(sk_lv.values(), default=1), "min_cog_skill": min(sk_lv.get(s, 1) for s in COGNITIVE),
            "records": records, "stars": stars, "three_star": three, "max_level": max_level,
            "tour_win": int("tour_win" in have), "duel_win": int("duel_win" in have),
            "early": int(early > 0), "night": int(night > 0), "comeback": int(any((b - a).days >= 7 for a, b in zip(days, days[1:]))),
            "days": len(days), "_have": have, "_total_xp": total,
        }

    async def award(self, user_id: int, code: str) -> bool:
        return await self.store._exec(
            "INSERT OR IGNORE INTO achievements (user_id, code, ts) VALUES (?, ?, ?)", (user_id, code, int(time.time()))
        ) == 1

    async def check_achievements(self, user_id: int, today: str, st: dict | None = None) -> list[dict]:
        """Статистика считается один раз; ачивки дают опыт → уровень профиля пересчитываем в памяти, без новых запросов."""
        st = st or await self.stats(user_id, today)
        have, new = set(st["_have"]), []
        while True:
            fresh = [a for a in ACHIEVEMENTS if a.code not in have and st.get(a.key, 0) >= a.goal]
            if not fresh:
                return new
            for a in fresh:
                have.add(a.code)
                if await self.award(user_id, a.code):
                    new.append({"code": a.code, "emoji": a.emoji, "title": a.title, "desc": a.desc})
            st["_total_xp"] += ACH_XP * len(fresh)
            st["level"] = level_from_xp(st["_total_xp"], 25)[0]  # могла открыться ачивка за уровень

    # ---------- запись партии ----------

    async def record_play(self, user_id: int, name: str, tz: int | None, game: Game, score: int,
                          mode: str = "free", level: int | None = None) -> dict:
        tz = await self.touch_user(user_id, name, tz)
        now = local_now(tz)
        day = now.date().isoformat()
        daily_games = await self.daily(user_id, day)
        today = await self._played_today(user_id, day)
        daily_before = await self.daily_state(user_id, day, set(today), daily_games)

        stars = 0
        unlocked_new = None
        if mode == "level" and level:
            stars = level_stars(game, level, score)
            old = await self.store._one("SELECT stars, best FROM levels WHERE user_id=? AND game=? AND level=?", (user_id, game.id, level))
            better_score = old is None or (score < old[1] if game.asc else score > old[1])
            if old is None:
                await self.store._exec("INSERT INTO levels (user_id, game, level, stars, best) VALUES (?, ?, ?, ?, ?)",
                                       (user_id, game.id, level, stars, score))
            else:
                await self.store._exec("UPDATE levels SET stars=?, best=? WHERE user_id=? AND game=? AND level=?",
                                       (max(stars, old[0]), score if better_score else old[1], user_id, game.id, level))
            if stars and (old is None or old[0] == 0) and level < MAX_LEVEL:
                unlocked_new = level + 1

        record = 0
        if mode == "free":
            agg = "MIN" if game.asc else "MAX"
            (prev,) = await self.store._one(f"SELECT {agg}(score) FROM plays WHERE user_id=? AND game=? AND mode='free'", (user_id, game.id))
            record = int(prev is not None and (score < prev if game.asc else score > prev))

        # опыт: база + звёзды/рекорд, ×сложность, убывает при повторении одной игры за день, бонус за игру из тренировки дня
        today_n = today.get(game.id, 0)
        variety = 1.0 if today_n < 3 else 0.5 if today_n < 6 else 0.25
        diff_mult = (1.0, 1.2, 1.5, 1.8)[level_difficulty(level)] if mode == "level" and level else 1.0
        xp = (10 + 5 * stars + 10 * record) * diff_mult * variety
        in_daily = any(i["id"] == game.id and not i["done"] for i in daily_before["games"])
        xp = round(xp + (15 if in_daily else 0))

        await self.store._exec(
            "INSERT INTO plays (user_id, game, score, mode, level, stars, record, xp, day, hour, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, game.id, score, mode, level, stars, record, xp, day, now.hour, int(time.time())),
        )
        daily_after = await self.daily_state(user_id, day, set(today) | {game.id}, daily_games)  # без повторного запроса
        st = await self.stats(user_id, day)
        after_play_xp = st["_total_xp"]
        new_ach = await self.check_achievements(user_id, day, st)
        after_xp = after_play_xp + ACH_XP * len(new_ach)
        before_xp = after_play_xp - xp
        lv_before = level_from_xp(before_xp, 25)[0]
        lv, start, nxt = level_from_xp(after_xp, 25)
        return {
            "xp": after_xp - before_xp, "play_xp": xp, "variety": variety, "in_daily": in_daily,
            "level": lv, "title": title_for(lv), "level_up": lv > lv_before, "xp_total": after_xp,
            "xp_start": start, "xp_next": nxt,
            "stars": stars, "record": bool(record), "unlocked": unlocked_new,
            "daily": daily_after, "daily_completed": daily_after["done"] and not daily_before["done"],
            "achievements": new_ach,
        }

    # ---------- профиль ----------

    async def profile(self, user_id: int, name: str, tz: int | None) -> dict:
        tz = await self.touch_user(user_id, name, tz)
        day = local_now(tz).date().isoformat()
        st = await self.stats(user_id, day)
        xp = st.pop("_total_xp")  # опыт и навыки — из уже посчитанной статистики, без лишних запросов
        have = st.pop("_have")
        lv, start, nxt = level_from_xp(xp, 25)
        sk = await self.skill_xp(user_id)
        games = {}
        for game_id, stars, mx in await self.store._all(
                "SELECT game, SUM(stars), MAX(CASE WHEN stars>0 THEN level ELSE 0 END) FROM levels WHERE user_id=? GROUP BY game", (user_id,)):
            games[game_id] = {"stars": stars, "passed": mx}
        for game_id, n, last in await self.store._all("SELECT game, COUNT(*), MAX(ts) FROM plays WHERE user_id=? GROUP BY game", (user_id,)):
            g = games.setdefault(game_id, {"stars": 0, "passed": 0})
            g["plays"], g["last"] = n, last
        user = await self.store._one("SELECT remind_on, remind_time, can_write, nickname, avatar FROM users WHERE user_id=?", (user_id,))
        skills = []
        for s in self.catalog.skills:
            slv, sst, snx = level_from_xp(int(sk.get(s.id, 0)), 15)
            skills.append({"id": s.id, "title": s.title, "desc": s.desc, "level": slv, "xp": int(sk.get(s.id, 0)), "start": sst, "next": snx})
        return {
            "name": name, "level": lv, "title": title_for(lv), "xp": xp, "xp_start": start, "xp_next": nxt,
            "skills": skills, "streak": await self.streak(user_id, day), "daily": await self.daily_state(user_id, day),
            "stats": st, "games": games, "levels_total": LEVELS,
            "achievements": [
                {"code": a.code, "emoji": a.emoji, "title": a.title, "desc": a.desc, "unlocked": a.code in have,
                 "progress": min(a.goal, st.get(a.key, 0)), "goal": a.goal}
                for a in ACHIEVEMENTS
            ],
            "reminder": {"on": bool(user[0]), "time": user[1], "can_write": bool(user[2])},
            "nickname": user[3], "avatar": user[4], "avatars": AVATARS,
            "prefs": await self.prefs.user(user_id),
            "prefs_schema": schema(USER),
        }

    # ---------- напоминания ----------

    async def set_reminder(self, user_id: int, name: str, tz: int | None, on: bool, at: str) -> None:
        await self.touch_user(user_id, name, tz)
        h, m = (int(x) for x in at.split(":"))
        if not (0 <= h < 24 and 0 <= m < 60):
            raise ValueError("bad time")
        await self.store._exec("UPDATE users SET remind_on=?, remind_time=?, can_write=1 WHERE user_id=?",
                               (int(on), f"{h:02d}:{m:02d}", user_id))

    async def due_reminders(self, now: float | None = None) -> list[tuple[int, str, dict]]:
        """Кому пора напомнить: включено, местное время наступило, сегодня ещё не напоминали и тренировка не сделана.
        «Напомнили» отмечается только после успешной отправки (mark_reminded) — сбой сети не съедает напоминание."""
        out = []
        for user_id, name, tz, at, reminded in await self.store._all(
                "SELECT user_id, name, tz, remind_time, reminded_on FROM users WHERE remind_on=1 AND can_write=1"):
            loc = local_now(tz, now)
            day = loc.date().isoformat()
            if reminded == day or loc.strftime("%H:%M") < at:
                continue
            daily = await self.daily_state(user_id, day)
            if daily["done"]:
                await self.mark_reminded(user_id, day)  # тренировка уже сделана — сегодня не напоминаем
            else:
                out.append((user_id, name, {"daily": daily, "streak": await self.streak(user_id, day), "day": day}))
        return out

    async def mark_reminded(self, user_id: int, day: str) -> None:
        await self.store._exec("UPDATE users SET reminded_on=? WHERE user_id=?", (day, user_id))

    async def mark_cant_write(self, user_id: int) -> None:
        await self.store._exec("UPDATE users SET can_write=0 WHERE user_id=?", (user_id,))
