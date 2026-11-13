"""HTTP: статика + API рекордов, уровней, профиля, турниров и дуэлей для Mini App."""

import re
import time
from html import escape
from pathlib import Path
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .catalog import Catalog, Game
from .config import Settings
from .db import Event, Row, Store
from .events import EventError, Events
from .progress import MAX_LEVEL, Progress
from .security import parse_ctx, validate_init_data
from .share import Sharer, ShareError

OnRecord = Callable[[int, Game, str, int], Awaitable[None]]

MAX_SCORE = 10**9


class AuthIn(BaseModel):
    initData: str
    tz: int | None = None  # Date.getTimezoneOffset()


class TopIn(AuthIn):
    ctx: str = ""


class ScoreIn(TopIn):
    score: int


class LevelIn(TopIn):
    level: int
    score: int


class ShareIn(TopIn):
    kind: str  # image | text
    image: str = ""  # data:image/png;base64,...
    text: str = ""
    send: str = "none"  # none — только сохранить, chat — бот отправит в чат, any — подготовить для «Переслать в любой чат»


class RollIn(TopIn):
    kind: str  # dice | coin | number | pick | teams
    n: int = 1
    sides: int = 6
    lo: int = 1
    hi: int = 100
    items: list[str] = []
    teams: int = 2
    post: bool = True


class MeIn(AuthIn):
    nickname: str | None = None
    avatar: str | None = None


class SettingsIn(AuthIn):
    changes: dict = {}


class ReminderIn(AuthIn):
    on: bool
    time: str = "19:00"


@dataclass
class Req:
    user: dict
    name: str
    game: Game
    chat_id: int  # чат для таблиц; без чата — личная таблица (chat_id = user_id)
    is_group: bool
    event: Event | None


def display_name(user: dict) -> str:
    name = " ".join(p for p in (user.get("first_name"), user.get("last_name")) if p).strip()
    return (name or user.get("username") or f"id{user['id']}")[:64]


def create_app(settings: Settings, store: Store, catalog: Catalog,
               on_record: OnRecord | None = None, events: Events | None = None,
               progress: Progress | None = None, sharer: Sharer | None = None) -> FastAPI:
    app = FastAPI(title="tg-arcade", docs_url=None, redoc_url=None)
    progress = progress or Progress(store, catalog)
    events = events or Events(store, catalog, progress=progress)
    last_submit: dict[tuple[int, str], float] = {}
    sharer = sharer or Sharer(Path(settings.db_path).parent / "uploads", settings.webapp_url)

    def auth(body: AuthIn) -> dict:
        if settings.dev_auth and body.initData == "dev":
            return {"user": {"id": 1, "first_name": "Dev"}, "start_param": None}
        a = validate_init_data(body.initData, settings.bot_token)
        if not a:
            raise HTTPException(401, "Сессия Telegram устарела — закрой и заново открой игру")
        return a

    async def resolve(body: TopIn) -> Req:
        a = auth(body)
        # ctx из запроса (игра, выбранная внутри хаба) приоритетнее start_param, с которым открыли Mini App;
        # подпись проверяется у обоих, а «голый» id игры даёт только личную таблицу
        ctx = parse_ctx(body.ctx or a["start_param"] or "", settings.ctx_secret)
        if not ctx:
            raise HTTPException(400, "bad ctx")
        game = catalog.get(ctx.game)
        if not game:
            raise HTTPException(404, "unknown game")
        user = a["user"]
        event = None
        chat_id = ctx.chat_id
        if ctx.event_id is not None:
            event = await store.get_event(ctx.event_id)
            if not event or event.game != game.id:
                raise HTTPException(404, "Событие не найдено")
            chat_id = event.chat_id
        if chat_id is None:
            chat_id = user["id"]
        name = await progress.table_name(user["id"], display_name(user))
        return Req(user, name, game, chat_id, chat_id < 0, event)

    def throttle(uid: int, game_id: str) -> None:
        now = time.monotonic()
        if len(last_submit) > 50_000:  # не даём словарю расти бесконечно
            for k in [k for k, t in last_submit.items() if now - t > 60]:
                del last_submit[k]
        if now - last_submit.get((uid, game_id), 0) < 1.0:
            raise HTTPException(429, "too fast")
        last_submit[(uid, game_id)] = now

    def check_score(game: Game, score: int) -> None:
        if not 0 <= score <= MAX_SCORE or (game.asc and score == 0):
            raise HTTPException(400, "bad score")

    def board(rows: list[Row], me: int) -> list[dict]:
        return [{"name": r.name, "score": r.best, "me": r.user_id == me} for r in rows]

    async def event_payload(req: Req) -> dict:
        uid = req.user["id"]
        ev = await store.get_event(req.event.id)  # свежее состояние (соперник, статус)
        rows = await events.top(ev, uid)
        rank = next((i + 1 for i, r in enumerate(rows) if r.user_id == uid), None)
        return {"group": req.is_group, "top": board(rows, uid), "rank": rank if ev.kind == "tour" else None,
                "event": await events.info(ev, uid)}

    @app.post("/api/top")
    async def api_top(body: TopIn):
        req = await resolve(body)
        if req.event:
            return await event_payload(req)
        rows = await store.top(req.chat_id, req.game.id, req.game.asc, 10)
        return {"group": req.is_group, "top": board(rows, req.user["id"]), "event": None}

    @app.post("/api/start")
    async def api_start(body: TopIn):
        """Перед раундом. Для дуэли фиксирует единственную попытку."""
        req = await resolve(body)
        if req.event:
            try:
                await events.start(req.event, req.user["id"], req.name)
            except EventError as e:
                raise HTTPException(e.status, e.message)
        return {"ok": True}

    @app.post("/api/score")
    async def api_score(body: ScoreIn):
        req = await resolve(body)
        game, uid = req.game, req.user["id"]
        check_score(game, body.score)
        throttle(uid, game.id)

        if req.event:
            try:
                await events.submit(req.event, uid, req.name, body.score)
            except EventError as e:
                raise HTTPException(e.status, e.message)
            # результат идёт и в обычную таблицу чата, но без объявлений о рекорде — итоги объявит событие
            await store.submit(req.chat_id, game.id, uid, req.name, body.score, game.asc)
            payload = await event_payload(req)
            payload["progress"] = await progress.record_play(uid, display_name(req.user), body.tz, game, body.score, "event")
            return payload

        res = await store.submit(req.chat_id, game.id, uid, req.name, body.score, game.asc)
        if req.is_group and res.chat_record and on_record:
            try:
                await on_record(req.chat_id, game, req.name, body.score)
            except Exception:  # уведомление не должно ломать сохранение очков
                pass
        rows = await store.top(req.chat_id, game.id, game.asc, 10)
        return {
            "best": res.best,
            "rank": res.rank,
            "personal_record": res.personal_record,
            "chat_record": res.chat_record,
            "group": req.is_group,
            "top": board(rows, uid),
            "event": None,
            "progress": await progress.record_play(uid, display_name(req.user), body.tz, game, body.score, "free"),
        }

    # ---------- уровни внутри игры ----------

    @app.post("/api/levels")
    async def api_levels(body: TopIn):
        req = await resolve(body)
        return await progress.game_levels(req.user["id"], req.game)

    @app.post("/api/level")
    async def api_level(body: LevelIn):
        req = await resolve(body)
        game, uid = req.game, req.user["id"]
        check_score(game, body.score)
        if not 1 <= body.level <= MAX_LEVEL:
            raise HTTPException(400, "bad level")
        state = await progress.game_levels(uid, game)
        if body.level > state["unlocked"]:
            raise HTTPException(403, "Этот уровень ещё закрыт")
        throttle(uid, game.id)
        result = await progress.record_play(uid, display_name(req.user), body.tz, game, body.score, "level", body.level)
        return {"progress": result, **(await progress.game_levels(uid, game))}

    # ---------- профиль и напоминания ----------

    @app.post("/api/profile")
    async def api_profile(body: AuthIn):
        a = auth(body)
        return await progress.profile(a["user"]["id"], display_name(a["user"]), body.tz)

    @app.post("/api/me")
    async def api_me(body: MeIn):
        """Свой ник и эмодзи-аватар (видны в таблицах и сообщениях бота)."""
        a = auth(body)
        try:
            return await progress.set_identity(a["user"]["id"], display_name(a["user"]), body.tz, body.nickname, body.avatar)
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.post("/api/settings")
    async def api_settings(body: SettingsIn):
        a = auth(body)
        uid = a["user"]["id"]
        await progress.touch_user(uid, display_name(a["user"]), body.tz)
        return {"prefs": await progress.prefs.set_user(uid, body.changes)}

    @app.post("/api/reminder")
    async def api_reminder(body: ReminderIn):
        a = auth(body)
        if not re.fullmatch(r"\d{1,2}:\d{2}", body.time):
            raise HTTPException(400, "bad time")
        try:
            await progress.set_reminder(a["user"]["id"], display_name(a["user"]), body.tz, body.on, body.time)
        except ValueError:
            raise HTTPException(400, "bad time")
        return {"ok": True}

    # ---------- приложения для чата ----------

    @app.post("/api/share")
    async def api_share(body: ShareIn):
        req = await resolve(body)
        uid = req.user["id"]
        throttle(uid, "share")
        try:
            if body.kind == "image":
                name, raw = sharer.save_image(body.image, uid)
                sent = await sharer.send_photo(req.chat_id, raw, f"🎨 {escape(req.name)} · {escape(req.game.name)}", uid) if body.send == "chat" else False
                prepared = await sharer.prepare(uid, photo_name=name, raw=raw) if body.send == "any" else None
                return {"url": sharer.url(name), "sent": sent, "prepared": prepared, "group": req.is_group}
            text = body.text.strip()[:3500]
            if not text:
                raise ShareError(400, "Пустой текст")
            html = f"{escape(text)}\n\n<i>— {escape(req.name)} · {escape(req.game.name)}</i>"
            sent = await sharer.send_text(req.chat_id, html, uid) if body.send == "chat" else False
            prepared = await sharer.prepare(uid, text=f"{text}\n\n— {req.name}") if body.send == "any" else None
            return {"sent": sent, "prepared": prepared, "group": req.is_group}
        except ShareError as e:
            raise HTTPException(e.status, e.message)

    @app.post("/api/roll")
    async def api_roll(body: RollIn):
        """Честный жребий на сервере: результат не подделать, бот публикует его сам."""
        req = await resolve(body)
        throttle(req.user["id"], "roll")
        try:
            res = Sharer.roll(body.kind, n=body.n, sides=body.sides, lo=body.lo, hi=body.hi, items=body.items, teams=body.teams)
            res["sent"] = await sharer.send_text(req.chat_id, f"{res['text']}\n<i>— бросок по запросу {escape(req.name)}</i>", req.user["id"]) if body.post else False
        except ShareError as e:
            raise HTTPException(e.status, e.message)
        res["group"] = req.is_group
        return res

    @app.get("/u/{name}")
    async def uploaded(name: str):
        p = sharer.file(name)
        if not p:
            raise HTTPException(404, "not found")
        mt = "image/png" if name.endswith(".png") else "image/jpeg"
        return FileResponse(p, media_type=mt, headers={"Content-Disposition": f'inline; filename="{name}"', "Cache-Control": "public, max-age=604800"})

    # ---------- свежесть файлов в Telegram ----------
    # Встроенный браузер Telegram агрессивно кэширует. Даём no-cache (перепроверка по ETag, 304 — дёшево),
    # а в HTML дописываем к скриптам версию сборки — после обновления клиент гарантированно берёт новые файлы.
    build = str(int(max(p.stat().st_mtime for p in settings.web_dir.rglob("*") if p.is_file())))

    @app.middleware("http")
    async def no_stale_cache(request: Request, call_next):
        resp = await call_next(request)
        if request.method == "GET" and not request.url.path.startswith(("/api/", "/u/")):
            resp.headers["Cache-Control"] = "no-cache"
        return resp

    def page(name: str) -> HTMLResponse:
        html = (settings.web_dir / name).read_text("utf-8")
        html = re.sub(r'(src|href)="(sdk/[^"?]+\.(?:js|css))"', rf'\1="\2?v={build}"', html)
        html = html.replace("<head>", f'<head><script>window.ARCADE_BUILD="{build}"</script>', 1)
        return HTMLResponse(html, headers={"Cache-Control": "no-cache"})

    @app.get("/play.html")
    async def play_page():
        return page("play.html")

    @app.get("/hub.html")
    async def hub_page():
        return page("hub.html")

    # Опечатки в URL Mini App (BotFather) → плеер. Фрагмент #tgWebAppData браузер сохраняет при редиректе.
    @app.get("/play")
    @app.get("/play.h")
    @app.get("/play.htm")
    async def play_alias(request: Request):
        q = request.url.query
        return RedirectResponse("/play.html" + (f"?{q}" if q else ""), status_code=307)

    app.mount("/", StaticFiles(directory=settings.web_dir, html=True), name="web")
    return app
