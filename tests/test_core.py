import asyncio
import hashlib
import hmac
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

from app.catalog import Catalog
from app.config import ROOT, Settings
from app.db import Store
from app.events import Events, parse_duration
from app.progress import level_mod, LEVELS, Progress, level_from_xp, level_goal, level_stars
from app.links import Links
from app.security import Ctx, make_ctx, make_event_ctx, parse_ctx, validate_init_data
from app.web import create_app

TOKEN = "123456:TEST-token"
SECRET = b"s" * 32


def sign(fields: dict, token: str = TOKEN) -> str:
    check = "\n".join(f"{k}={fields[k]}" for k in sorted(fields))
    key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    return urlencode({**fields, "hash": hmac.new(key, check.encode(), hashlib.sha256).hexdigest()})


def init_data(user_id=1, name="Ann", start_param=None, auth_date=None) -> str:
    f = {"auth_date": str(auth_date or int(time.time())), "user": json.dumps({"id": user_id, "first_name": name})}
    if start_param:
        f["start_param"] = start_param
    return sign(f)


def test_init_data_valid_and_tampered():
    data = init_data(start_param="snake")
    ok = validate_init_data(data, TOKEN)
    assert ok["user"]["id"] == 1 and ok["start_param"] == "snake"
    assert validate_init_data(data, "other:token") is None
    assert validate_init_data(data.replace("Ann", "Bob"), TOKEN) is None
    assert validate_init_data(init_data(auth_date=1000), TOKEN) is None  # протухло
    assert validate_init_data("", TOKEN) is None


def test_ctx_roundtrip_and_forgery():
    for chat in (-1001234567890, 42):
        ctx = make_ctx("snake", chat, SECRET)
        assert re.fullmatch(r"[A-Za-z0-9_-]{1,512}", ctx)
        assert parse_ctx(ctx, SECRET) == Ctx("snake", chat)
    forged = make_ctx("snake", -100, SECRET).replace("m100", "m200")
    assert parse_ctx(forged, SECRET) is None
    assert parse_ctx("snake", SECRET) == Ctx("snake")
    assert parse_ctx("../etc", SECRET) is None
    ev = make_event_ctx("snake", 17, SECRET)
    assert parse_ctx(ev, SECRET) == Ctx("snake", None, 17)
    assert parse_ctx(ev.replace("_e17_", "_e18_"), SECRET) is None
    assert parse_ctx(ev.replace("snake", "tower"), SECRET) is None


def test_parse_duration():
    assert parse_duration("30м") == 30
    assert parse_duration("2ч") == 120
    assert parse_duration("1d") == 1440
    assert parse_duration("45") == 45
    assert parse_duration("змейка") is None


def test_catalog_matches_game_files():
    cat = Catalog(ROOT / "web/games/catalog.json")
    assert len(cat) >= 122
    for g in cat.games.values():
        assert re.fullmatch(r"[a-z0-9-]{1,32}", g.id)
        section = cat.section(g.section)
        assert section, f"{g.id}: нет раздела {g.section}"
        if section.groups:
            assert g.group in {gr.id for gr in section.groups}, f"{g.id}: нет подгруппы {g.group}"
        src = (ROOT / "web/games" / f"{g.id}.js").read_text("utf-8")
        assert "Arcade.register" in src or "Learn.load(" in src
        assert "Math.random" not in src, f"{g.id}: случайность только через api.rand (турниры)"
    assert cat.find("змей").id == "snake"
    assert sum(len(cat.list(s.id)) for s in cat.sections) == len(cat)
    for s in cat.sections:  # длина callback_data ≤ 64 байт
        for gr in s.groups or [None]:
            assert len(f"lst:{s.id}:{gr.id if gr else '*'}:99".encode()) <= 64


def test_bot_menus_build():
    from app.bot import build_router

    store = Store(":memory:")
    cat = Catalog(ROOT / "web/games/catalog.json")
    links = Links("arcade_bot", "", SECRET)
    assert links.event("snake", 5).startswith("https://t.me/arcade_bot?startapp=snake_e5_")
    build_router(store, cat, links, Events(store, cat, links))


class FakeBot:
    """Пишет вызовы Bot API в список вместо Telegram."""

    def __init__(self):
        self.sent, self.edits, self._mid = [], [], 100

    async def send_message(self, chat_id, text, **kw):
        self._mid += 1
        self.sent.append((chat_id, text))
        return type("Msg", (), {"message_id": self._mid})()

    async def edit_message_text(self, **kw):
        self.edits.append(kw)

    async def pin_chat_message(self, *a, **kw):
        pass

    async def unpin_chat_message(self, *a, **kw):
        pass


@pytest.fixture
def client(tmp_path: Path):
    settings = Settings(bot_token=TOKEN, db_path=str(tmp_path / "t.db"))
    records = []

    async def on_record(chat_id, game, name, score, lang="ru"):
        records.append((chat_id, game.id, name, score))

    store = Store(settings.db_path)
    catalog = Catalog(settings.web_dir / "games/catalog.json")
    bot = FakeBot()
    progress = Progress(store, catalog)
    events = Events(store, catalog, Links("arcade_bot", "play", settings.ctx_secret), bot, progress)
    app = create_app(settings, store, catalog, on_record, events, progress)
    with TestClient(app) as c:
        c.settings, c.records, c.store, c.catalog, c.events, c.bot = settings, records, store, catalog, events, bot
        c.progress = progress
        yield c


def test_score_flow(client):
    chat = -100555
    ctx = make_ctx("snake", chat, client.settings.ctx_secret)
    post = lambda uid, name, score: client.post(
        "/api/score", json={"initData": init_data(uid, name, start_param=ctx), "score": score}
    )
    r = post(1, "Ann", 10).json()
    assert r["chat_record"] and r["rank"] == 1 and r["group"]
    r = post(2, "Bob", 5).json()
    assert not r["chat_record"] and r["rank"] == 2
    time.sleep(1.05)
    r = post(1, "Ann", 3).json()  # хуже личного — лучший остаётся 10
    assert r["best"] == 10 and not r["personal_record"]
    assert [(t["name"], t["score"]) for t in r["top"]] == [("Ann", 10), ("Bob", 5)]
    assert client.records == [(chat, "snake", "Ann", 10)]


def test_asc_game_and_rejects(client):
    ctx = make_ctx("reaction", -7, client.settings.ctx_secret)
    ok = client.post("/api/score", json={"initData": init_data(1, start_param=ctx), "score": 250})
    assert ok.status_code == 200
    r = client.post("/api/score", json={"initData": init_data(2, start_param=ctx), "score": 200}).json()
    assert r["chat_record"] and r["rank"] == 1  # меньше — лучше
    assert client.post("/api/score", json={"initData": "hash=bad", "score": 1}).status_code == 401
    bad_ctx = client.post("/api/score", json={"initData": init_data(3), "ctx": "snake_m7_000000000000", "score": 1})
    assert bad_ctx.status_code == 400
    assert client.post("/api/score", json={"initData": init_data(4, start_param=ctx), "score": 0}).status_code == 400


def test_static_served(client):
    assert client.get("/play.html").status_code == 200
    assert client.get("/sdk/arcade.js").status_code == 200
    assert client.get("/games/snake.js").status_code == 200


# ---------- турниры и дуэли ----------

def call(c, path, uid, ctx, name="P", **extra):
    return c.post(f"/api/{path}", json={"initData": init_data(uid, name, start_param=ctx), **extra})


def settle(c):
    """Дать отработать фоновым задачам (обновление карточки, объявление итогов)."""
    c.portal.call(asyncio.sleep, 0.05)


def test_tournament_flow(client):
    c = client
    ev = c.portal.call(c.events.create_tournament, -500, c.catalog.get("snake"), 30, 1, "Ann")
    assert c.bot.sent and "Турнир" in c.bot.sent[0][1]
    ctx = make_event_ctx("snake", ev.id, c.settings.ctx_secret)

    info = call(c, "top", 2, ctx).json()
    assert info["event"]["kind"] == "tour" and not info["event"]["closed"]
    assert call(c, "score", 1, ctx, "Ann", score=7).json()["rank"] == 1
    r = call(c, "score", 2, ctx, "Bob", score=9).json()
    assert r["rank"] == 1 and [t["name"] for t in r["top"]] == ["Bob", "Ann"]
    time.sleep(1.05)
    r = call(c, "score", 1, ctx, "Ann", score=3).json()  # хуже своего лучшего — не портит
    assert [(t["name"], t["score"]) for t in r["top"]] == [("Bob", 9), ("Ann", 7)]

    # время вышло → тикер объявляет итоги ровно один раз
    c.portal.call(c.store._exec, "UPDATE events SET ends_at=0 WHERE id=?", (ev.id,))
    c.portal.call(c.events.tick)
    c.portal.call(c.events.tick)
    finals = [t for _, t in c.bot.sent if "завершён" in t]
    assert len(finals) == 1 and "Bob" in finals[0]
    assert call(c, "score", 3, ctx, score=5).status_code == 410


def test_duel_open_challenge(client):
    c = client
    ev = c.portal.call(c.events.create_duel, -600, c.catalog.get("reaction"), 1, "Ann")
    ctx = make_event_ctx("reaction", ev.id, c.settings.ctx_secret)

    # без старта попытка не засчитывается
    assert call(c, "score", 1, ctx, "Ann", score=300).status_code == 409
    assert call(c, "start", 1, ctx, "Ann").status_code == 200
    assert call(c, "start", 1, ctx, "Ann").status_code == 409  # вторая попытка запрещена
    time.sleep(1.05)
    assert call(c, "score", 1, ctx, "Ann", score=300).status_code == 200

    # соперник ещё не сыграл — чужой результат не показываем
    assert call(c, "top", 2, ctx, "Bob").json()["top"] == []
    assert call(c, "start", 2, ctx, "Bob").status_code == 200  # принял открытый вызов
    assert call(c, "start", 3, ctx, "Eve").status_code == 403  # третий лишний
    assert call(c, "score", 2, ctx, "Bob", score=250).status_code == 200  # reaction: меньше — лучше
    settle(c)
    final = [t for _, t in c.bot.sent if "побеждает" in t]
    assert final and "Bob" in final[0].split("побеждает")[0]
    assert call(c, "top", 3, ctx).json()["event"]["closed"]


def test_duel_named_opponent_and_forfeit(client):
    c = client
    ev = c.portal.call(c.events.create_duel, -700, c.catalog.get("snake"), 1, "Ann", 2, "Bob")
    ctx = make_event_ctx("snake", ev.id, c.settings.ctx_secret)
    assert call(c, "start", 3, ctx, "Eve").status_code == 403
    call(c, "start", 1, ctx, "Ann")
    call(c, "score", 1, ctx, "Ann", score=4)
    c.portal.call(c.store._exec, "UPDATE events SET ends_at=0 WHERE id=?", (ev.id,))
    c.portal.call(c.events.tick)
    assert any("Ann" in t and "не успел" in t for _, t in c.bot.sent)


# ---------- прогрессия ----------

def test_level_formulas():
    cat = Catalog(ROOT / "web/games/catalog.json")
    snake, reaction = cat.get("snake"), cat.get("reaction")
    goals = [level_goal(snake, k) for k in range(1, LEVELS + 1)]
    assert goals == sorted(goals) and goals[0] < snake.par < goals[-1]  # цели растут
    rgoals = [level_goal(reaction, k) for k in range(1, LEVELS + 1)]
    assert rgoals == sorted(rgoals, reverse=True)  # для «меньше — лучше» — падают
    g = level_goal(snake, 5)
    assert [level_stars(snake, 5, v) for v in (g - 1, g, int(g * 1.25) + 1, int(g * 1.5) + 1)] == [0, 1, 2, 3]
    assert level_stars(reaction, 1, level_goal(reaction, 1) + 1) == 0
    assert level_from_xp(0, 25)[0] == 1 and level_from_xp(50, 25)[0] == 2 and level_from_xp(149, 25)[0] == 2


def test_levels_unlock_and_xp(client):
    c = client
    lv = lambda uid, k, score: c.post("/api/level", json={"initData": init_data(uid), "ctx": "snake", "level": k, "score": score, "tz": -180})
    assert lv(1, 2, 100).status_code == 403  # второй уровень закрыт
    goal1 = level_goal(c.catalog.get("snake"), 1)
    r = lv(1, 1, goal1 - 1).json()
    assert r["progress"]["stars"] == 0 and r["unlocked"] == 1
    time.sleep(1.05)
    r = lv(1, 1, goal1 * 2).json()
    assert r["progress"]["stars"] == 3 and r["progress"]["unlocked"] == 2 and r["unlocked"] == 2
    assert r["levels"][0]["stars"] == 3
    assert r["progress"]["xp"] > 0 and any(a["code"] == "first" for a in r["progress"]["achievements"]) is False  # «первый шаг» дали ещё за первую партию
    prof = c.post("/api/profile", json={"initData": init_data(1), "tz": -180}).json()
    assert prof["xp"] > 0 and prof["stats"]["plays"] == 2 and prof["stats"]["stars"] == 3
    assert next(a for a in prof["achievements"] if a["code"] == "first")["unlocked"]
    assert len(prof["daily"]["games"]) == 3


def test_variety_reduces_xp(client):
    c = client
    xps = []
    for i in range(4):
        r = c.post("/api/score", json={"initData": init_data(7), "ctx": "math", "score": 3, "tz": 0}).json()
        xps.append(r["progress"]["play_xp"])
        time.sleep(1.05)
    assert xps[3] < xps[2]  # 4-я партия той же игры за день — меньше опыта


def test_daily_training_completion(client):
    c = client
    prof = c.post("/api/profile", json={"initData": init_data(9), "tz": 0}).json()
    games = [g["id"] for g in prof["daily"]["games"]]
    assert len(set(games)) == 3
    skills = [set(c.catalog.get(g).skills) for g in games]
    assert skills[0] & {"speed", "attention"}  # первая — всегда на скорость/внимание
    last = None
    for g in games:
        game = c.catalog.get(g)
        last = c.post("/api/score", json={"initData": init_data(9), "ctx": g, "score": 500 if game.asc else 3, "tz": 0}).json()
    p = last["progress"]
    assert p["daily_completed"] and p["in_daily"]
    assert {"daily1"} <= {a["code"] for a in p["achievements"]}
    prof = c.post("/api/profile", json={"initData": init_data(9), "tz": 0}).json()
    assert prof["streak"]["current"] == 1 and prof["streak"]["today"]


def test_streak_with_freeze(client):
    c = client
    from datetime import date, timedelta
    today = date(2026, 11, 20)
    days = [today - timedelta(days=i) for i in range(1, 9)]  # 8 дней подряд до вчера → 1 заморозка
    for d in days:
        c.portal.call(c.store._exec, "INSERT INTO daily (user_id, day, games, done) VALUES (?, ?, '[]', 1)", (5, d.isoformat()))
    s = c.portal.call(c.progress.streak, 5, today.isoformat())
    assert s["current"] == 8 and s["freezes"] == 1 and not s["today"]
    # пропуск одного дня прикрывается заморозкой
    s = c.portal.call(c.progress.streak, 5, (today + timedelta(days=1)).isoformat())
    assert s["current"] == 8
    s = c.portal.call(c.progress.streak, 5, (today + timedelta(days=3)).isoformat())
    assert s["current"] == 0


def test_reminders_due_once(client):
    c = client
    assert c.post("/api/reminder", json={"initData": init_data(11), "on": True, "time": "00:00", "tz": 0}).status_code == 200
    due = c.portal.call(c.progress.due_reminders)
    assert [u for u, _, _ in due] == [11]
    # пока отправка не подтверждена — напоминание остаётся в очереди (сбой сети не съедает его)
    assert [u for u, _, _ in c.portal.call(c.progress.due_reminders)] == [11]
    c.portal.call(c.progress.mark_reminded, 11, due[0][2]["day"])
    assert c.portal.call(c.progress.due_reminders) == []  # отправили — второй раз за день нет
    assert c.post("/api/reminder", json={"initData": init_data(11), "on": True, "time": "25:00"}).status_code == 400


def test_tournament_win_achievement(client):
    c = client
    ev = c.portal.call(c.events.create_tournament, -900, c.catalog.get("snake"), 30, 1, "Ann")
    ctx = make_event_ctx("snake", ev.id, c.settings.ctx_secret)
    call(c, "score", 2, ctx, "Bob", score=9)
    c.portal.call(c.store._exec, "UPDATE events SET ends_at=0 WHERE id=?", (ev.id,))
    c.portal.call(c.events.tick)
    prof = c.post("/api/profile", json={"initData": init_data(2)}).json()
    assert next(a for a in prof["achievements"] if a["code"] == "tour_win")["unlocked"]


# ---------- приложения для чата ----------

PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="


def test_share_image_and_download(client):
    c = client
    r = c.post("/api/share", json={"initData": init_data(21), "ctx": "draw", "kind": "image", "image": PNG_1x1, "send": "none"})
    assert r.status_code == 200
    name = r.json()["url"].rsplit("/", 1)[1]
    got = c.get(f"/u/{name}")
    assert got.status_code == 200 and got.content.startswith(b"\x89PNG")
    assert c.get("/u/../../etc.png").status_code == 404
    bad = c.post("/api/share", json={"initData": init_data(22), "ctx": "draw", "kind": "image", "image": "data:image/png;base64,AAAA", "send": "none"})
    assert bad.status_code == 400


def test_fair_rolls(client):
    c = client
    dice = c.post("/api/roll", json={"initData": init_data(31), "ctx": "dice", "kind": "dice", "n": 3, "sides": 6, "post": False}).json()
    assert len(dice["values"]) == 3 and all(1 <= v <= 6 for v in dice["values"]) and dice["total"] == sum(dice["values"])
    time.sleep(1.05)
    pick = c.post("/api/roll", json={"initData": init_data(31), "ctx": "wheel", "kind": "pick", "items": ["a", "b", "c"], "post": False}).json()
    assert pick["value"] == ["a", "b", "c"][pick["index"]]
    time.sleep(1.05)
    teams = c.post("/api/roll", json={"initData": init_data(31), "ctx": "teams", "kind": "teams", "items": list("abcde"), "teams": 2, "post": False}).json()
    assert sorted(sum(teams["teams"], [])) == list("abcde") and {len(t) for t in teams["teams"]} == {2, 3}
    time.sleep(1.05)
    assert c.post("/api/roll", json={"initData": init_data(31), "ctx": "wheel", "kind": "pick", "items": ["один"]}).status_code == 400


def test_infinite_levels(client):
    cat = client.catalog
    for gid in ("snake", "reaction", "schulte"):
        g = cat.get(gid)
        plain = [level_goal(g, k) for k in range(1, 60) if level_mod(k) is None]
        assert plain == (sorted(plain, reverse=True) if g.asc else sorted(plain))  # обычные уровни монотонно сложнее
        for k in range(10, 60, 10):  # босс главы не легче соседних уровней
            harder = (lambda a, b: a <= b) if g.asc else (lambda a, b: a >= b)
            assert level_mod(k) == "boss" and harder(level_goal(g, k), level_goal(g, k - 1))
        if g.asc:
            assert min(level_goal(g, k) for k in range(1, 60)) >= g.par * g.floor - 1  # «на время» не уходит в невозможное
    assert len(client.catalog.list("apps")) == 6 and all(g.app for g in client.catalog.list("apps"))


# ---------- настройки ----------

def test_user_settings(client):
    c = client
    prof = c.post("/api/profile", json={"initData": init_data(41)}).json()
    assert prof["prefs"]["daily_size"] == 3 and {o["key"] for o in prof["prefs_schema"]} >= {"sound", "theme", "hide_name"}
    r = c.post("/api/settings", json={"initData": init_data(41), "changes": {"theme": "dark", "daily_size": 5, "sound": "громко", "junk": 1}}).json()
    assert r["prefs"]["theme"] == "dark" and r["prefs"]["daily_size"] == 5 and r["prefs"]["sound"] is True  # мусор отброшен
    assert len(c.post("/api/profile", json={"initData": init_data(41)}).json()["daily"]["games"]) == 3  # день уже начат — набор не меняется
    c.post("/api/settings", json={"initData": init_data(41), "changes": {"hide_name": True}})
    top = c.post("/api/score", json={"initData": init_data(41, "Секрет"), "ctx": "snake", "score": 5}).json()["top"]
    assert top[0]["name"].startswith("Игрок №")


def test_chat_settings_disable_tournaments(client):
    c = client
    c.portal.call(c.progress.prefs.set_chat, -1234, "tours", False)
    with pytest.raises(Exception, match="выключены"):
        c.portal.call(c.events.create_tournament, -1234, c.catalog.get("snake"), None, 1, "Ann")
    c.portal.call(c.progress.prefs.set_chat, -1234, "tours", True)
    c.portal.call(c.progress.prefs.set_chat, -1234, "tour_minutes", 15)
    ev = c.portal.call(c.events.create_tournament, -1234, c.catalog.get("snake"), None, 1, "Ann")
    assert 14 * 60 <= ev.ends_at - ev.created <= 15 * 60
    assert c.portal.call(c.progress.prefs.set_chat, -1234, "tour_minutes", 999)["tour_minutes"] == 15  # недопустимое не ставится



def test_content_checker():
    """Колоды без неоднозначностей, генераторы без битых заданий, шахматные задачи проигрываются — tools/check_games.mjs."""
    import shutil
    import subprocess

    if not shutil.which("node"):
        pytest.skip("нет node")
    r = subprocess.run(["node", str(ROOT / "tools/check_games.mjs")], capture_output=True, text=True, timeout=300)
    assert r.returncode == 0, r.stdout + r.stderr


def test_nickname_and_avatar(client):
    c = client
    assert c.post("/api/me", json={"initData": init_data(51), "nickname": "a", "avatar": "🦊"}).status_code == 400  # слишком короткий
    assert c.post("/api/me", json={"initData": init_data(51), "nickname": "Мозгоправ", "avatar": "💩"}).status_code == 400  # не из списка
    r = c.post("/api/me", json={"initData": init_data(51), "nickname": "  Мозгоправ  2000 ", "avatar": "🦊"}).json()
    assert r == {"nickname": "Мозгоправ 2000", "avatar": "🦊"}
    top = c.post("/api/score", json={"initData": init_data(51, "Вася"), "ctx": "snake", "score": 7}).json()["top"]
    assert top[0]["name"] == "🦊 Мозгоправ 2000"
    prof = c.post("/api/profile", json={"initData": init_data(51)}).json()
    assert prof["nickname"] == "Мозгоправ 2000" and "🦊" in prof["avatars"]
    c.post("/api/me", json={"initData": init_data(51), "nickname": "", "avatar": ""})  # сброс → имя из Telegram
    assert c.post("/api/profile", json={"initData": init_data(51)}).json()["nickname"] is None



# ---------- исправления по ревью ----------

def test_profile_keeps_real_telegram_name(client):
    c = client
    c.post("/api/me", json={"initData": init_data(61), "nickname": "Ник", "avatar": "🦊"})
    c.post("/api/score", json={"initData": init_data(61, "Вася"), "ctx": "snake", "score": 3})
    (name,) = c.portal.call(c.store._one, "SELECT name FROM users WHERE user_id=?", (61,))
    assert name == "Вася"  # в профиль — настоящее имя, а не «🦊 Ник»
    time.sleep(1.05)
    c.post("/api/score", json={"initData": init_data(61, "Василий"), "ctx": "snake", "score": 4})
    (name,) = c.portal.call(c.store._one, "SELECT name FROM users WHERE user_id=?", (61,))
    assert name == "Василий"  # смена имени в Telegram подхватывается


def test_record_play_query_budget(client):
    c = client
    c.post("/api/score", json={"initData": init_data(71), "ctx": "snake", "score": 3})  # первый заход: создание игрока и тренировки дня
    time.sleep(1.05)
    before = c.store.queries
    r = c.post("/api/score", json={"initData": init_data(71), "ctx": "math", "score": 5})
    assert r.status_code == 200
    used = c.store.queries - before
    assert used <= 22, f"запросов на одну партию: {used}"  # было ~40


def test_group_posting_guard(tmp_path):
    import asyncio

    from app.share import Sharer, ShareError

    class Bot:
        def __init__(self, status):
            self.status = status

        async def get_chat_member(self, chat_id, user_id):
            return type("M", (), {"status": self.status})()

    async def run():
        outsider = Sharer(tmp_path, "https://x", Bot("left"))
        with pytest.raises(ShareError, match="участники"):
            await outsider.guard(-100, 1)
        member = Sharer(tmp_path, "https://x", Bot("member"))
        await member.guard(-100, 1)
        with pytest.raises(ShareError, match="Не чаще"):
            await member.guard(-100, 1)  # сразу повторно — слишком часто
        await member.guard(42, 1)  # личка — без ограничений

    asyncio.run(run())


# ---------- два языка ----------

def test_i18n_language_pick():
    from app.i18n import from_code, pick

    assert from_code("ru") == "ru" and from_code("uk") == "ru" and from_code("en-US") == "en" and from_code("pt-br") == "en"
    assert from_code(None) == "ru"
    assert pick("en", "ru") == "en" and pick("auto", "de") == "en" and pick(None, "kk") == "ru"


def test_catalog_languages():
    cat = Catalog(ROOT / "web/games/catalog.json")
    ru, en = cat.list(lang="ru"), cat.list(lang="en")
    assert all(g.lang != "en" for g in ru) and all(g.lang != "ru" for g in en)
    assert cat.get("ege-stress") not in en and cat.get("en-confused") in en
    assert all(g.title_en for g in en), "у каждой игры английского каталога есть английское название"
    for s in cat.sections:
        assert s.title_en and all(gr.title_en for gr in s.groups)
    snake = cat.get("snake")
    assert snake.label("en") == "🐍 Snake" or snake.t("en") == "Snake"
    assert cat.find("snake", "en") is snake and cat.find("змейка", "en") is snake  # ищем на любом языке
    assert cat.get("reaction").fmt(250, "en") == "250 ms" and cat.get("reaction").fmt(250) == "250 мс"


def test_profile_and_events_in_english(client):
    c = client
    r = c.post("/api/profile", json={"initData": init_data(81), "lang": "en"}).json()
    assert r["title"] == "Rookie"
    assert any(a["title"] == "First step" for a in r["achievements"])
    assert r["skills"][0]["title"].endswith("Speed")
    assert {o["key"]: o for o in r["prefs_schema"]}["lang"]["title"] == "Language"
    daily = [c.catalog.get(i["id"]) for i in r["daily"]["games"]]
    assert all(g.lang != "ru" for g in daily), "в тренировку дня англоязычному не попадают русские колоды"
    # язык из настроек сохраняется для напоминаний
    c.post("/api/settings", json={"initData": init_data(81), "changes": {"lang": "en"}})
    assert asyncio.run(c.store._one("SELECT lang FROM users WHERE user_id=81"))[0] == "en"
    # турнир, созданный на английском, объявляется по-английски
    asyncio.run(c.events.create_tournament(-500, c.catalog.get("snake"), 30, 81, "Ann", "en"))
    assert "Tournament" in c.bot.sent[-1][1] and "Турнир" not in c.bot.sent[-1][1]


def test_reminder_text_languages():
    from app.reminders import reminder_text

    info = {"daily": {"games": [1, 2, 3], "count": 1}, "streak": {"current": 4, "freezes": 1}, "lang": "en"}
    assert "daily workout" in reminder_text("Ann Lee", info) and "Streak" in reminder_text("Ann Lee", info)
    assert "тренировку дня" in reminder_text("Аня", {**info, "lang": "ru"})


def test_chapters_and_boss_reward(client):
    c = client
    assert [level_mod(k) for k in range(1, 11)] == [None, None, None, "sharp", None, None, None, "fast", None, "boss"]
    g = c.catalog.get("snake")
    uid = 91
    for k in range(1, 10):  # проходим главу до босса
        r = c.post("/api/level", json={"initData": init_data(uid), "ctx": "snake", "level": k, "score": level_goal(g, k)})
        assert r.status_code == 200, r.text
        time.sleep(1.01)
    r = c.post("/api/level", json={"initData": init_data(uid), "ctx": "snake", "level": 10, "score": level_goal(g, 10)}).json()
    assert r["progress"]["chapter_clear"] == 1 and r["progress"]["play_xp"] >= 50
    assert any(a["code"] == "boss1" for a in r["progress"]["achievements"])
    assert r["levels"][9]["mod"] == "boss" and len(r["levels"]) % 10 == 0
