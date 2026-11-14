import asyncio
import time
from dataclasses import dataclass
from pathlib import Path

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS scores (
    chat_id INTEGER NOT NULL,
    game    TEXT    NOT NULL,
    user_id INTEGER NOT NULL,
    name    TEXT    NOT NULL,
    best    INTEGER NOT NULL,
    plays   INTEGER NOT NULL DEFAULT 1,
    updated INTEGER NOT NULL,
    PRIMARY KEY (chat_id, game, user_id)
);
CREATE INDEX IF NOT EXISTS scores_board ON scores (chat_id, game, best);

CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    kind          TEXT    NOT NULL,              -- tour | duel
    chat_id       INTEGER NOT NULL,
    game          TEXT    NOT NULL,
    created_by    INTEGER NOT NULL,
    creator_name  TEXT    NOT NULL,
    opponent_id   INTEGER,                       -- дуэль: NULL = открытый вызов
    opponent_name TEXT,
    ends_at       INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'active',
    message_id    INTEGER,
    created       INTEGER NOT NULL,
    lang          TEXT    NOT NULL DEFAULT 'ru'  -- язык сообщений события (ru | en)
);
CREATE INDEX IF NOT EXISTS events_due ON events (status, ends_at);

-- ---------- прогрессия (единый профиль игрока, общий для всех чатов) ----------
CREATE TABLE IF NOT EXISTS users (
    user_id     INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    tz          INTEGER NOT NULL DEFAULT -180,   -- Date.getTimezoneOffset(): UTC − местное, минуты
    remind_on   INTEGER NOT NULL DEFAULT 0,
    remind_time TEXT    NOT NULL DEFAULT '19:00',
    can_write   INTEGER NOT NULL DEFAULT 1,      -- 0: бот получил отказ при отправке
    reminded_on TEXT,                            -- местная дата последнего напоминания
    created     INTEGER NOT NULL,
    prefs       TEXT    NOT NULL DEFAULT '{}',   -- личные настройки (только отличия от умолчаний)
    nickname    TEXT,                            -- свой ник (вместо имени из Telegram)
    lang        TEXT,                            -- язык интерфейса (ru | en): для напоминаний
    avatar      TEXT                             -- эмодзи-аватар
);
CREATE TABLE IF NOT EXISTS chats (
    chat_id INTEGER PRIMARY KEY,
    prefs   TEXT    NOT NULL DEFAULT '{}'        -- настройки группы (/settings)
);
CREATE TABLE IF NOT EXISTS plays (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game    TEXT    NOT NULL,
    score   INTEGER NOT NULL,
    mode    TEXT    NOT NULL,                    -- free | level | event
    level   INTEGER,
    stars   INTEGER NOT NULL DEFAULT 0,
    record  INTEGER NOT NULL DEFAULT 0,          -- личный рекорд в свободной игре
    xp      INTEGER NOT NULL,
    day     TEXT    NOT NULL,                    -- местная дата игрока YYYY-MM-DD
    hour    INTEGER NOT NULL,                    -- местный час
    ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS plays_user ON plays (user_id, day);
CREATE INDEX IF NOT EXISTS plays_user_game ON plays (user_id, game, mode);
CREATE TABLE IF NOT EXISTS levels (
    user_id INTEGER NOT NULL,
    game    TEXT    NOT NULL,
    level   INTEGER NOT NULL,
    stars   INTEGER NOT NULL,
    best    INTEGER NOT NULL,
    PRIMARY KEY (user_id, game, level)
);
CREATE TABLE IF NOT EXISTS achievements (
    user_id INTEGER NOT NULL,
    code    TEXT    NOT NULL,
    ts      INTEGER NOT NULL,
    PRIMARY KEY (user_id, code)
);
CREATE TABLE IF NOT EXISTS daily (
    user_id INTEGER NOT NULL,
    day     TEXT    NOT NULL,
    games   TEXT    NOT NULL,                    -- JSON-список id игр
    done    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS event_scores (
    event_id INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    name     TEXT    NOT NULL,
    best     INTEGER,                            -- NULL: попытка начата, результата нет
    attempts INTEGER NOT NULL DEFAULT 0,
    updated  INTEGER NOT NULL,
    PRIMARY KEY (event_id, user_id)
);
"""

EVENT_COLS = "id, kind, chat_id, game, created_by, creator_name, opponent_id, opponent_name, ends_at, status, message_id, created, lang"


@dataclass
class Event:
    id: int
    kind: str
    chat_id: int
    game: str
    created_by: int
    creator_name: str
    opponent_id: int | None
    opponent_name: str | None
    ends_at: int
    status: str
    message_id: int | None
    created: int
    lang: str = "ru"


@dataclass
class Submit:
    personal_record: bool
    chat_record: bool
    prev_chat_best: int | None
    best: int
    rank: int


@dataclass
class Row:
    user_id: int
    name: str
    best: int


class Store:
    """Лучший результат каждого игрока в каждой игре, отдельно для каждого чата."""

    def __init__(self, path: str):
        self.path = path
        self._conn: aiosqlite.Connection | None = None
        self._lock = asyncio.Lock()
        self.queries = 0  # счётчик запросов — для тестов производительности

    async def _db(self) -> aiosqlite.Connection:
        if self._conn is None:
            async with self._lock:
                if self._conn is None:
                    if self.path != ":memory:":
                        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
                    conn = await aiosqlite.connect(self.path)
                    await conn.executescript(SCHEMA)
                    # миграции для баз, созданных старыми версиями
                    cols = {r[1] for r in await (await conn.execute("PRAGMA table_info(users)")).fetchall()}
                    if "prefs" not in cols:
                        await conn.execute("ALTER TABLE users ADD COLUMN prefs TEXT NOT NULL DEFAULT '{}'")
                    if "nickname" not in cols:
                        await conn.execute("ALTER TABLE users ADD COLUMN nickname TEXT")
                    if "avatar" not in cols:
                        await conn.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
                    if "lang" not in cols:
                        await conn.execute("ALTER TABLE users ADD COLUMN lang TEXT")
                    ecols = {r[1] for r in await (await conn.execute("PRAGMA table_info(events)")).fetchall()}
                    if "lang" not in ecols:
                        await conn.execute("ALTER TABLE events ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'")
                    await conn.commit()
                    self._conn = conn
        return self._conn

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    async def submit(self, chat_id: int, game: str, user_id: int, name: str, score: int, asc: bool) -> Submit:
        db = await self._db()
        better = (lambda a, b: a < b) if asc else (lambda a, b: a > b)
        agg = "MIN" if asc else "MAX"
        async with self._lock:
            cur = await db.execute(
                "SELECT best FROM scores WHERE chat_id=? AND game=? AND user_id=?", (chat_id, game, user_id)
            )
            mine = await cur.fetchone()
            cur = await db.execute(f"SELECT {agg}(best) FROM scores WHERE chat_id=? AND game=?", (chat_id, game))
            (chat_best,) = await cur.fetchone()

            personal = mine is None or better(score, mine[0])
            best = score if personal else mine[0]
            await db.execute(
                """INSERT INTO scores (chat_id, game, user_id, name, best, plays, updated)
                   VALUES (?, ?, ?, ?, ?, 1, ?)
                   ON CONFLICT (chat_id, game, user_id)
                   DO UPDATE SET best=excluded.best, name=excluded.name, plays=plays+1, updated=excluded.updated""",
                (chat_id, game, user_id, name, best, int(time.time())),
            )
            await db.commit()
            op = "<" if asc else ">"
            cur = await db.execute(
                f"SELECT COUNT(*) FROM scores WHERE chat_id=? AND game=? AND best {op} ?", (chat_id, game, best)
            )
            (ahead,) = await cur.fetchone()
        return Submit(
            personal_record=personal,
            chat_record=chat_best is None or better(score, chat_best),
            prev_chat_best=chat_best,
            best=best,
            rank=ahead + 1,
        )

    async def top(self, chat_id: int, game: str, asc: bool, limit: int = 10) -> list[Row]:
        db = await self._db()
        order = "ASC" if asc else "DESC"
        cur = await db.execute(
            f"SELECT user_id, name, best FROM scores WHERE chat_id=? AND game=? ORDER BY best {order}, updated ASC LIMIT ?",
            (chat_id, game, limit),
        )
        return [Row(*r) for r in await cur.fetchall()]

    async def chat_best(self, chat_id: int, game: str, asc: bool) -> Row | None:
        rows = await self.top(chat_id, game, asc, 1)
        return rows[0] if rows else None

    # ---------- турниры и дуэли ----------

    async def _exec(self, sql: str, args: tuple = ()) -> int:
        self.queries += 1
        db = await self._db()
        async with self._lock:
            cur = await db.execute(sql, args)
            await db.commit()
            return cur.rowcount

    async def _all(self, sql: str, args: tuple = ()) -> list[tuple]:
        self.queries += 1
        db = await self._db()
        cur = await db.execute(sql, args)
        return list(await cur.fetchall())

    async def _one(self, sql: str, args: tuple = ()) -> tuple | None:
        self.queries += 1
        db = await self._db()
        cur = await db.execute(sql, args)
        return await cur.fetchone()

    async def create_event(self, kind: str, chat_id: int, game: str, user_id: int, name: str, ends_at: int,
                           opponent_id: int | None = None, opponent_name: str | None = None, lang: str = "ru") -> Event:
        db = await self._db()
        async with self._lock:
            cur = await db.execute(
                "INSERT INTO events (kind, chat_id, game, created_by, creator_name, opponent_id, opponent_name, ends_at, created, lang)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (kind, chat_id, game, user_id, name, opponent_id, opponent_name, ends_at, int(time.time()), lang),
            )
            await db.commit()
            event_id = cur.lastrowid
        return await self.get_event(event_id)

    async def get_event(self, event_id: int) -> Event | None:
        db = await self._db()
        cur = await db.execute(f"SELECT {EVENT_COLS} FROM events WHERE id=?", (event_id,))
        row = await cur.fetchone()
        return Event(*row) if row else None

    async def active_events(self, chat_id: int) -> list[Event]:
        db = await self._db()
        cur = await db.execute(f"SELECT {EVENT_COLS} FROM events WHERE chat_id=? AND status='active' ORDER BY id", (chat_id,))
        return [Event(*r) for r in await cur.fetchall()]

    async def due_events(self, now: int) -> list[Event]:
        db = await self._db()
        cur = await db.execute(f"SELECT {EVENT_COLS} FROM events WHERE status='active' AND ends_at<=?", (now,))
        return [Event(*r) for r in await cur.fetchall()]

    async def set_event_message(self, event_id: int, message_id: int) -> None:
        await self._exec("UPDATE events SET message_id=? WHERE id=?", (message_id, event_id))

    async def claim_opponent(self, event_id: int, user_id: int, name: str) -> bool:
        """Открытый вызов принимает первый пришедший (не сам автор)."""
        n = await self._exec(
            "UPDATE events SET opponent_id=?, opponent_name=? WHERE id=? AND opponent_id IS NULL AND created_by<>?",
            (user_id, name, event_id, user_id),
        )
        return n == 1

    async def finish_event(self, event_id: int) -> bool:
        """True только у того, кто реально закрыл событие — итоги объявляются ровно один раз."""
        return await self._exec("UPDATE events SET status='done' WHERE id=? AND status='active'", (event_id,)) == 1

    async def start_attempt(self, event_id: int, user_id: int, name: str) -> bool:
        """Для дуэли: фиксируем единственную попытку ДО начала игры. False — попытка уже была."""
        n = await self._exec(
            "INSERT OR IGNORE INTO event_scores (event_id, user_id, name, best, attempts, updated) VALUES (?, ?, ?, NULL, 1, ?)",
            (event_id, user_id, name, int(time.time())),
        )
        return n == 1

    async def event_submit(self, event_id: int, user_id: int, name: str, score: int, asc: bool, single: bool) -> bool:
        now = int(time.time())
        if single:
            n = await self._exec(
                "UPDATE event_scores SET best=?, name=?, updated=? WHERE event_id=? AND user_id=? AND best IS NULL",
                (score, name, now, event_id, user_id),
            )
            return n == 1
        op = "<" if asc else ">"
        await self._exec(
            f"""INSERT INTO event_scores (event_id, user_id, name, best, attempts, updated) VALUES (?, ?, ?, ?, 1, ?)
                ON CONFLICT (event_id, user_id) DO UPDATE SET
                  best = CASE WHEN best IS NULL OR excluded.best {op} best THEN excluded.best ELSE best END,
                  updated = CASE WHEN best IS NULL OR excluded.best {op} best THEN excluded.updated ELSE updated END,
                  attempts = attempts + 1, name = excluded.name""",
            (event_id, user_id, name, score, now),
        )
        return True

    async def event_entry(self, event_id: int, user_id: int) -> tuple[int | None, int] | None:
        """(best, attempts) игрока или None, если он не участвовал."""
        db = await self._db()
        cur = await db.execute("SELECT best, attempts FROM event_scores WHERE event_id=? AND user_id=?", (event_id, user_id))
        return await cur.fetchone()

    async def event_top(self, event_id: int, asc: bool, limit: int = 10) -> list[Row]:
        db = await self._db()
        order = "ASC" if asc else "DESC"
        cur = await db.execute(
            f"SELECT user_id, name, best FROM event_scores WHERE event_id=? AND best IS NOT NULL"
            f" ORDER BY best {order}, updated ASC LIMIT ?",
            (event_id, limit),
        )
        return [Row(*r) for r in await cur.fetchall()]

    async def event_players(self, event_id: int) -> int:
        db = await self._db()
        cur = await db.execute("SELECT COUNT(*) FROM event_scores WHERE event_id=? AND best IS NOT NULL", (event_id,))
        return (await cur.fetchone())[0]
