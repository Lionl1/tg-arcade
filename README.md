# 🕹 Brain Arcade — mini-games for Telegram groups

**English** · [Русский](README.ru.md)

A Telegram bot with a catalog of HTML5 mini-games that open as a Telegram Mini App. The idea: AI does more and more of our thinking, so the brain needs a daily workout — 5 minutes of brain training, study with spaced repetition and exam prep, plus arcade games to relax.

The whole app is bilingual — **English and Russian**. The language comes from the user's Telegram settings and can be changed in `/settings` (private chat), the “Settings” tab of the Mini App, or per group with `/settings` in the group.

In a group:

1. `/games` (or `/play snake`, `/play` for a random one) → the bot posts a game card with a **▶️ Play** button.
2. The game opens right inside Telegram and the result goes to the server (the `initData` signature is checked).
3. Every chat has its own leaderboard (`/top snake` or the 🏆 button); when someone sets a chat record the bot announces it with “⚔️ Beat the record”.

## The idea: one system, four pillars

Everything serves one mission — **stay sharp in the age of AI** — and rests on four pillars: 🧠 **Mind** (brain training), 📚 **Knowledge** (study and exams), 💻 **Code** (algorithms), 💪 **Body** (workouts), plus 🕹 Play (arcade breaks) and 👥 Together (chat apps, tournaments, duels).

- **One progress system**: every game feeds the same XP, skills, achievements and the knowledge graph.
- **Daily workout by pillar**: mind → knowledge → body, picked for your weak skills; the hub shows which pillars you covered today.
- **Paths** (`paths` in `catalog.json`): routes through different sections towards one goal — First steps (a tour of every pillar), Sharp mind, Hard to fool, Programmer, Polymath, Exam ready, Strong body. Progress is tracked on the server, the active path is on the home tab, `/paths` in the bot.
- **Linked games**: every game shows its pillar, skills and paths; after a round it suggests the next step on your path and related games from other sections that train the same skills.

## Sections (in order of importance)

| Section | What's inside |
|---|---|
| 🧠 Brain training | reaction, numbers (incl. estimation), memory (N-back, **dual N-back**), attention, logic (sudoku, test tubes, nonograms, **Lichess chess puzzles**), reasoning, **🛡 critical thinking** (syllogisms, cognitive biases, logical fallacies), words |
| 🎓 Exams & school | **English interface:** math (6 generated topics: arithmetic, equations, logarithms, percent & probability, derivatives & sequences, trig), English (commonly confused words, spelling, grammar & usage, advanced vocabulary), literature (literary terms, who wrote it, famous characters), history (key dates, US presidents, **famous paintings from Wikidata**), civics & economics, computer science, physics, chemistry. **Russian interface:** the same math and sciences plus Russian-exam (ЕГЭ) courses — stress, paronyms, Russian literature and history |
| 📚 Study & languages | every country (capitals, flags, continents, neighbours, which is bigger), **Russian for English speakers** (basic and advanced words, 800 Tatoeba phrases) / English for Russian speakers, trivia (600 questions), math, biology |
| 💻 Algorithms | step-by-step animations with pseudocode and real, tested Python and JavaScript; practice (build the code, be the sort, trace the code, find the bug) and flashcards |
| 💪 Body | pull-up bar, dips, street-workout circuit, push-up programme, full-body circuit, Tabata, core, morning workout, stretching, a 3-minute phone break. Levels are programme days with progression; exercises and photos from the open **free-exercise-db**. After 25 minutes of play in a row the app suggests a short break |
| 🕹 Chill: arcade | runners and skill games |
| 🛠 For chats | drawing, memes, fair draws, teams, bill splitting |

The daily workout picks a speed/attention game, games for your weakest skills and **one study deck** (retrieval practice is the best-proven technique).

**Gradual difficulty in free play**: arcade games and trainers speed up during a round; flashcard tests and several trainers add a shrinking answer time limit; single puzzles grow in steps 1–4 in personal play (chats and tournaments use the standard size so records stay fair).

**Content checks**: `node tools/check_games.mjs` (run by `pytest`) loads every game in **both languages**, runs each generator thousands of times, looks for ambiguous cards and broken options, flags Russian text left in the English interface, replays every chess puzzle and executes all teaching code in real Python. Data sources and licences: [docs/credits.md](docs/credits.md).

## Progression and profile

The design follows research findings — summary and sources in [docs/research.md](docs/research.md).

- **Hub** (`/profile`): Today, Games, Profile, Science, Settings tabs.
- **Daily workout** — 3 (or 5) games for different skills, ≈5 minutes, fixed for the day.
- **Streak** — days with a finished workout; every 7 days give a “freeze” (up to 2) that covers one missed day.
- **Endless levels in every game** with 1–3 ★, grouped into **chapters of 10** on a winding map: levels 4 and 8 are challenges with a modifier (⚡ speed-up, ⏱ time crunch, 💥 costly mistakes), level 10 is the **chapter boss** (higher goal, faster pace, +50 XP and achievements). Many games add **new mechanics by chapter** (snake: rocks and golden berries; maze: keys and fog; bricks: tough and steel bricks; test tubes: hidden colours; sequence: backwards; digits: backward span…), declared as `chapters: {2: '…'}` in the game file.
- **Study decks on levels are lessons**: 8 cards per lesson from easy to hard — read them, then a timed check; the boss is the chapter exam. **Algorithm animations** get levels too: “predict the next step” from the real frames of the algorithm.
- **XP**, profile levels and titles, **10 skills**, **30 achievements + 10 secret Easter eggs**, an activity calendar and weekly summary (`/week`), first-run onboarding (pick a goal → your path), optional **daily reminder** in private messages.
- **Flashcards** with spaced repetition (1 → 3 → 7 → 14 → 30 days).

Locally without Telegram: `DEV_AUTH=1` on the server and `?dev` in the URL (`hub.html?dev`, `play.html?g=snake&dev`); `?lang=en` forces the language.

## Tournaments and duels

| Command | What it does |
|---|---|
| `/tournament snake 30m` | A tournament (`10m`, `2h`, `1d`; default from chat settings). The card is pinned and updated live; the bot announces the podium when time is up. |
| `/duel snake` | An open challenge: the first to tap “Accept challenge” becomes the opponent. |
| `/duel snake` as a reply | Challenge that person. |
| `/events` | What's running in the chat. |

Everyone plays the **same level** (the event id seeds the RNG). A duel is one try, locked on the server when it starts.

## Settings

- **Personal** — language, sound, vibration, theme, text size, animations, what opens first, tips, games in the daily workout, cards per session, algorithm animation speed, hiding your name, reminder. Stored on the server and in `localStorage`.
- **Group** — `/settings` in the group (admins only): bot language, record announcements, tournaments and duels on/off and their length, pinning.
- **Server** — limits in `.env` (see `.env.example`).

All options are declared in `app/prefs.py` (default, allowed values, labels in both languages).

## How it's built

```
main.py              web server (FastAPI) + bot (aiogram) in one process
app/i18n.py          languages: tr(lang, "по-русски", "in English"), language from Telegram / settings
app/bot.py           commands, catalog by section, game cards, leaderboards
app/events.py        tournaments and duels
app/web.py           API + static files
app/progress.py      XP, levels, skills, daily workout, streaks, achievements, reminders
web/sdk/prefs.js     personal settings + interface language: L('по-русски', 'in English')
web/sdk/arcade.js    game SDK: Telegram theme, HUD, menus, levels, leaderboards, input, canvas
web/sdk/learn.js     flashcard engine (spaced repetition + points test)
web/games/catalog.json  metadata of all games (title/desc + title_en/desc_en, "lang" for single-language games)
web/games/<id>.js    one game = one file
```

## Adding a game

1. Add an entry to `web/games/catalog.json`: `id`, `title`, `title_en`, `emoji`, `section`, `group`, `desc`, `desc_en`; `"lang": "en"` or `"ru"` if the content exists in one language only.
2. Create `web/games/<id>.js`, with every visible string as `L('Русский', 'English')`:

```js
Arcade.register({
  howto: L('Как играть', 'How to play'),
  start(api) {
    const g = api.canvas();
    api.onTap((x, y) => api.addScore(1));
    api.timer(30);
    api.loop((dt) => { /* draw */ });
  },
});
```

3. `uv run pytest` — checks the catalog, every deck and generator in both languages.

## Running locally

```bash
uv sync
uv run python main.py          # without BOT_TOKEN only the web part runs: http://localhost:8080
```

## Connecting to Telegram

1. @BotFather → `/newbot` → put the token into `.env` (`BOT_TOKEN`).
2. You need a public HTTPS address; for development: `cloudflared tunnel --url http://localhost:8080` → `WEBAPP_URL`.
3. Set the bot's Mini App URL in @BotFather to `<WEBAPP_URL>/play.html`.
4. `uv run python main.py`, add the bot to a group, `/games`.

## Limitations

Scores are computed on the client, so a determined cheater can submit any number; the server checks the signature, range and rate only. Not suitable for money competitions.

## Licence

Code — [MIT](LICENSE). Open data keeps its own licences (CC0, CC BY 2.0 FR, CC BY-SA 4.0, ODbL 1.0) — see [docs/credits.md](docs/credits.md).
