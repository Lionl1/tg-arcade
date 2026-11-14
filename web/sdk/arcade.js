/* Аркада SDK: всё общее для мини-игр (Telegram, HUD, меню, уровни, рекорды, прогресс, ввод, холст).
 *
 * Игра — один файл web/games/<id>.js:
 *   Arcade.register({
 *     howto: 'Как играть',
 *     chapters: { 2: 'новая механика с главы 2', 3: '…' },  // показываются на карте и в начале главы; в игре — api.chapter
 *     start(api) { ... }   // вызывается на каждый раунд с пустой сценой; конец раунда — api.end(score)
 *   });
 * Всё, что создано через api (on/loop/after/every/timer), само убирается после api.end().
 *
 * Режимы раунда:
 *   free  — свободная игра, рекорды (чата или личные), обычная сложность;
 *   level — один из 12 уровней: своё зерно (уровень всегда одинаковый), цель по очкам, 1–3 звезды,
 *           сложность лёгкая/обычная/сложная (скорость игры и время таймера);
 *   event — турнир или дуэль чата.
 */
(() => {
  'use strict';
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.initData);
  const qs = new URLSearchParams(location.search);
  const devAuth = !inTg && qs.has('dev'); // локальная отладка с DEV_AUTH=1 на сервере
  const authed = inTg || devAuth;
  const initData = inTg ? tg.initData : 'dev';
  const startParam = (inTg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || '';
  const ctx = qs.get('ctx') || qs.get('g') || startParam || '';
  const gameId = (ctx.split('_')[0] || '').replace(/[^a-z0-9-]/g, '');
  const TZ = new Date().getTimezoneOffset();
  if (!gameId || gameId === 'hub') { location.replace('hub.html' + location.search + location.hash); return; }
  // Турнир/дуэль: ctx = <game>_e<id>_<sig>. У всех участников одно зерно → одинаковый уровень.
  const evPart = ctx.split('_')[1] || '';
  const eventKey = evPart[0] === 'e' ? evPart : qs.get('seed') ? 'seed' + qs.get('seed') : '';
  let event = null; // {kind, title, single, played, note, closed} — приходит с сервера

  const PAGE = 10; // уровней в главе; сами уровни бесконечные — главы идут одна за другой
  const DIFF_NAMES = L('Лёгкая|Обычная|Сложная|Экстрим', 'Easy|Normal|Hard|Extreme').split('|');
  const DIFF_COLORS = ['var(--good)', 'var(--accent)', 'var(--bad)', '#a371f7'];
  // сложность растёт плавно и без потолка: скорость игры и время таймера
  const speedOf = (k) => Math.min(1.6, 0.85 + 0.3 * Math.min(1, (k - 1) / 11) + 0.02 * Math.max(0, k - 12));
  const timeOf = (k) => Math.max(0.6, 1.25 - 0.4 * Math.min(1, (k - 1) / 11) - 0.01 * Math.max(0, k - 12));

  function seededRng(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const $ = (s) => document.querySelector(s);
  const hud = { title: $('#hud-title'), score: $('#hud-score'), timer: $('#hud-timer') };
  const stage = $('#stage');
  const overlay = $('#overlay');
  let meta = null, def = null, round = null, opts = { mode: 'free' }, levels = null, CAT = null;

  // ---------- Telegram + тема ----------
  if (tg) {
    try {
      tg.ready(); tg.expand();
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      if (inTg && tg.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(() => { location.href = 'hub.html'; }); }
    } catch (e) { /* старые клиенты */ }
    const p = tg.themeParams || {};
    const map = { bg: p.bg_color, card: p.secondary_bg_color, fg: p.text_color, hint: p.hint_color, accent: p.button_color, 'accent-fg': p.button_text_color };
    for (const [k, v] of Object.entries(map)) if (v) document.documentElement.style.setProperty('--' + k, v);
    try { if (p.secondary_bg_color) tg.setHeaderColor(p.secondary_bg_color); } catch (e) { /* noop */ }
  }
  const PREFS = window.ArcadePrefs;
  if (PREFS) PREFS.apply(); // личная тема/размер текста/анимации поверх темы Telegram
  const pref = (k, d) => (PREFS ? PREFS.get(k) : d);
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue('--' + n).trim();
    return {
      bg: v('bg'), card: v('card'), fg: v('fg'), hint: v('hint'), accent: v('accent'), accentFg: v('accent-fg'),
      good: v('good'), bad: v('bad'), warn: v('warn'),
      palette: ['#e5534b', '#f0883e', '#e3b341', '#3fb950', '#39c5cf', '#4a90e2', '#a371f7', '#db61a2'],
    };
  }

  function haptic(kind) {
    const h = tg && tg.HapticFeedback;
    if (!h || !pref('haptics', true)) return;
    try {
      if (kind === 'success' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind);
      else if (kind === 'select') h.selectionChanged();
      else h.impactOccurred(kind || 'light');
    } catch (e) { /* noop */ }
  }

  let audio = null;
  function tone(freq = 440, ms = 120, type = 'sine', vol = 0.15) {
    if (!pref('sound', true)) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + ms / 1000);
    } catch (e) { /* без звука */ }
  }

  // ---------- форматирование, уровни, хранилище ----------
  function fmt(v) {
    if (v == null) return '—';
    if (meta.format === 'ms') return v + L(' мс', ' ms');
    if (meta.format === 'sec') return (v / 1000).toFixed(2) + L(' с', ' s');
    return String(v) + (meta.unit ? ' ' + meta.unit : '');
  }
  const asc = () => meta.order === 'asc';
  const better = (a, b) => (b == null ? true : asc() ? a < b : a > b);
  // те же формулы, что в app/progress.py
  const factorOf = (k) => {
    if (asc()) { const fl = meta.floor || 0.65; return fl + (2.0 - fl) * Math.pow(0.82, k - 1); }
    const ce = meta.ceil || 2.5, f = ce - (ce - 0.35) * Math.pow(0.88, k - 1);
    return meta.timed ? f * timeOf(k) : f;
  };
  // главы (как в app/progress.py): 4-й и 8-й уровни — испытания с модификатором, 10-й — босс
  const MODS = ['fast', 'rush', 'sharp'];
  const modOf = (k) => {
    const i = (k - 1) % PAGE + 1, c = Math.floor((k - 1) / PAGE) + 1;
    const m = i === PAGE ? 'boss' : i === 4 || i === 8 ? MODS[(2 * c + (i === 8 ? 1 : 0)) % 3] : null;
    return meta && meta.section === 'fit' && m !== 'boss' ? null : m; // тренировки тела не ускоряем и не штрафуем — только «контрольный день» в конце главы
  };
  const modGoal = (k) => { const m = modOf(k); return m === 'boss' ? (asc() ? 0.9 : 1.15) : m === 'rush' && meta.timed && !asc() ? 0.85 : 1; };
  const MOD_INFO = {
    fast: ['⚡', L('Ускорение: всё на 15 % быстрее', 'Speed-up: everything is 15% faster')],
    rush: ['⏱', L('Цейтнот: времени на 20 % меньше', 'Time crunch: 20% less time')],
    sharp: ['💥', L('Дорогие ошибки: штраф за ошибку вдвое больше', 'Costly mistakes: penalties are doubled')],
    boss: ['👑', L('Босс главы: цель выше и всё быстрее', 'Chapter boss: a higher goal and a faster pace')],
  };
  const CHAPTERS = L(['🌱 Разминка', '🔥 Разгон', '🎯 Точность', '⚡ Скорость', '🧗 Подъём', '🌪 Буря', '🏔 Вершина', '🌌 Космос'],
    ['🌱 Warm-up', '🔥 Ramp-up', '🎯 Precision', '⚡ Speed', '🧗 Climb', '🌪 Storm', '🏔 Summit', '🌌 Cosmos']);
  const chapterName = (c) => CHAPTERS[(c - 1) % CHAPTERS.length] + (c > CHAPTERS.length ? ' ' + ['', 'II', 'III', 'IV', 'V'][Math.min(4, Math.floor((c - 1) / CHAPTERS.length))] || '' : '');
  const goalOf = (k) => {
    const g = Math.max(1, Math.floor(meta.par * factorOf(k) * modGoal(k) + 0.5));
    return asc() ? Math.max(g, Math.floor(meta.par * (meta.floor || 0.65) + 0.5)) : g; // «на время»: даже босс не ниже предела
  };
  const starsOf = (k, s) => {
    const g = goalOf(k);
    return asc() ? [g, g * 0.85, g * 0.7].filter((t) => s <= t).length : [g, g * 1.25, g * 1.5].filter((t) => s >= t).length;
  };
  const diffOf = (k) => (k <= 3 ? 0 : k <= 8 ? 1 : k <= 20 ? 2 : 3);
  const levelOpts = (k) => {
    const m = modOf(k);
    return { mode: 'level', level: k, diff: diffOf(k), mod: m, seedKey: 'lvl' + k,
      speed: speedOf(k) * (m === 'fast' || m === 'boss' ? 1.15 : 1), time: timeOf(k) * (m === 'rush' ? 0.8 : 1), penalty: m === 'sharp' || m === 'boss' ? 2 : 1 };
  };
  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('arcade:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('arcade:' + k, JSON.stringify(v)); } catch (e) { /* noop */ } },
  };

  async function api(path, body) {
    const r = await fetch(new URL('api/' + path, location.href), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ initData, ctx, tz: TZ, lang: LANG }, body)),
    });
    if (!r.ok) {
      let msg = L('Ошибка ', 'Error ') + r.status;
      try { msg = (await r.json()).detail || msg; } catch (e) { /* noop */ }
      throw new Error(msg);
    }
    return r.json();
  }

  /** Состояние уровней: с сервера (общий профиль) или из localStorage вне Telegram. */
  async function loadLevels() {
    if (authed) { levels = await api('levels'); return levels; }
    const saved = store.get('lv:' + gameId) || {};
    let unlocked = 1;
    while ((saved[unlocked] || {}).stars > 0) unlocked++;
    const last = Math.ceil(unlocked / PAGE) * PAGE;
    levels = {
      unlocked,
      levels: [...Array(last)].map((_, i) => ({ n: i + 1, goal: goalOf(i + 1), diff: diffOf(i + 1), mod: modOf(i + 1), stars: (saved[i + 1] || {}).stars || 0, best: (saved[i + 1] || {}).best })),
    };
    return levels;
  }
  function saveLevelLocal(k, score) {
    const saved = store.get('lv:' + gameId) || {};
    const cur = saved[k] || { stars: 0, best: null };
    saved[k] = { stars: Math.max(cur.stars, starsOf(k, score)), best: better(score, cur.best) ? score : cur.best };
    store.set('lv:' + gameId, saved);
  }
  const totalStars = () => (levels ? levels.levels.reduce((s, l) => s + l.stars, 0) : 0);

  function toastMsg(msg, ms = 2200) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------- оверлеи ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function boardHtml(top, group) {
    if (!top || !top.length) return event ? '' : `<p class="muted">${L('Таблица пуста — будь первым!', 'The table is empty — be the first!')}</p>`;
    const label = event ? (event.kind === 'duel' ? L('Дуэль', 'Duel') : L('Таблица турнира', 'Tournament table')) : group ? L('Рекорды чата', 'Chat records') : L('Твои рекорды', 'Your records');
    return `<p class="muted">${label}</p><ol class="lb">` + top.map((r, i) =>
      `<li class="${r.me ? 'me' : ''}"><span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="nm">${esc(r.name)}</span><span class="sc">${fmt(r.score)}</span></li>`
    ).join('') + '</ol>';
  }
  function progressHtml(p) {
    if (!p) return '';
    const span = Math.max(1, p.xp_next - p.xp_start), have = p.xp_total - p.xp_start;
    const notes = [];
    if (p.in_daily) notes.push(L('🎯 тренировка дня', '🎯 daily workout'));
    if (p.record) notes.push(L('📈 рекорд', '📈 record'));
    if (p.variety < 1) notes.push(L('↘ повтор: другие игры дают больше', '↘ repeat: other games give more'));
    let html = `<div class="prog"><div class="xp">+${p.xp} XP${notes.length ? ' · ' + notes.join(' · ') : ''}</div>
      <div class="bar"><i style="width:${Math.min(100, (have / span) * 100)}%"></i></div>
      <div class="muted">${L('Уровень', 'Level')} ${p.level} · ${esc(p.title)} · ${have}/${span}</div>`;
    if (p.level_up) html += `<div class="badge">🎉 ${L('Новый уровень профиля', 'New profile level')}: ${p.level}!</div>`;
    if (p.daily_completed) html += `<div class="badge">${L('🔥 Тренировка дня завершена!', '🔥 Daily workout complete!')}</div>`;
    else if (p.in_daily) html += `<div class="muted">${L('Тренировка дня', 'Daily workout')}: ${p.daily.count}/${p.daily.games.length}</div>`;
    html += `<a class="hublink" href="hub.html?tab=profile#graph">${L('🕸 Граф знаний обновлён — посмотреть', '🕸 Knowledge graph updated — take a look')}</a>`;
    for (const a of p.achievements || []) html += `<div class="ach-new">${a.secret ? '🥚 ' : ''}${a.emoji} <b>${esc(a.title)}</b><small>${a.secret ? L('Пасхалка! ', 'Easter egg! ') : ''}${esc(a.desc)} · +25 XP</small></div>`;
    return html + '</div>';
  }
  function show(html) {
    overlay.innerHTML = `<div class="card">${html}</div>`;
    overlay.hidden = false;
    return overlay.firstElementChild;
  }
  function bind(card, actions) {
    card.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.act](b)));
  }
  const hubLink = () => (authed ? `<a class="hublink" href="hub.html">${L('🧠 Профиль и тренировка дня', '🧠 Profile and daily workout')}</a>` : '');

  function setHudTitle() {
    hud.title.textContent = opts.mode === 'level'
      ? `${opts.mod ? MOD_INFO[opts.mod][0] : meta.emoji} ${L('Ур.', 'Lv.')} ${opts.level} · ${L('цель', 'goal')} ${fmt(goalOf(opts.level))}`
      : meta.emoji + ' ' + meta.title;
  }

  // ---------- связи между играми: опора, навыки, пути, «что дальше» ----------
  const visible = (g) => g && (!g.lang || g.lang === LANG);
  const gameById = (id) => CAT && CAT.games.find((g) => g.id === id);
  const titleOf = (g) => (LANG === 'en' && g.title_en) || g.title;
  const stepGame = (st) => (LANG === 'en' && st.game_en) || st.game;
  function pathsOfGame() {
    if (!CAT || !CAT.paths) return [];
    return CAT.paths.map((p) => {
      const steps = p.steps.map(stepGame).filter((id) => visible(gameById(id)));
      const i = steps.indexOf(gameId);
      return i < 0 ? null : { p, steps, i };
    }).filter(Boolean);
  }
  function aboutHtml() {
    if (!CAT) return '';
    const sec = CAT.sections.find((x) => x.id === meta.section);
    const pl = sec && (CAT.pillars || []).find((x) => x.id === sec.pillar);
    const sk = (meta.skills || []).map((id) => CAT.skills.find((x) => x.id === id)).filter(Boolean);
    const paths = pathsOfGame();
    return `<div class="chips-skills">${pl ? `<span>${pl.emoji} ${esc(L(pl.title, pl.title_en))}</span>` : ''}${sk.map((x) => `<span>${esc(L(x.title, x.title_en))}</span>`).join('')}</div>`
      + (paths.length ? `<p class="muted" style="font-size:12px">🧭 ${L('В путях', 'In paths')}: ${paths.map(({ p, steps, i }) => `${p.emoji} ${esc(L(p.title, p.title_en))} (${i + 1}/${steps.length})`).join(' · ')}</p>` : '');
  }
  /** После партии: следующий шаг пути и похожие игры из других разделов (общий навык) */
  function relatedHtml() {
    if (!CAT) return '';
    let active = null;
    try { active = localStorage.getItem('arcade:path'); } catch (e) { /* noop */ }
    const paths = pathsOfGame();
    const pp = paths.find((x) => x.p.id === active) || paths[0];
    const links = [];
    if (pp && pp.i < pp.steps.length - 1) links.push({ g: gameById(pp.steps[pp.i + 1]), next: `${pp.p.emoji} ${L('Дальше по пути', 'Next on the path')}: ` });
    const mine = new Set(meta.skills || []);
    const near = CAT.games.filter((g) => visible(g) && !g.app && g.id !== gameId && !links.some((l) => l.g && l.g.id === g.id) && (g.skills || []).some((x) => mine.has(x)))
      .sort((a, b) => (a.section === meta.section) - (b.section === meta.section) || ((a.id.length * 7 + gameId.length) % 5) - ((b.id.length * 7 + gameId.length) % 5));
    near.slice(0, 2).forEach((g) => links.push({ g }));
    const ok = links.filter((l) => l.g);
    return ok.length ? `<div class="related">${ok.map((l) => `<a class="${l.next ? 'next' : ''}" href="play.html?g=${l.g.id}${devAuth ? '&dev' : ''}">${l.next || ''}${l.g.emoji} ${esc(titleOf(l.g))}</a>`).join('')}</div>` : '';
  }

  // ---------- меню ----------
  let firstMenu = true;
  function showMenu() {
    if (def.app || meta.app) return startRound({ mode: 'app' });
    const freeAct = () => startRound({ mode: def.viz ? 'app' : 'free' }); // у анимаций алгоритмов «свободная игра» — сама анимация
    opts = { mode: 'free' };
    setHudTitle();
    if (eventKey) return showEventMenu();
    if (firstMenu) { // настройка «при открытии игры»
      firstMenu = false;
      if (pref('open_mode', 'menu') === 'levels') return showLevels();
      if (pref('open_mode', 'menu') === 'free') return freeAct();
    }
    const best = store.get('best:' + gameId);
    const card = show(`
      <div class="emoji">${meta.emoji}</div>
      <h1>${esc(meta.title)}</h1>
      ${aboutHtml()}
      <p class="howto">${esc(def.howto || meta.desc)}</p>
      <div class="modes">
        <button class="btn" data-act="levels">${L('🎯 Уровни', '🎯 Levels')}<small class="lvinfo">${L('Бесконечные уровни: каждый новый сложнее, до 3 ★ за каждый', 'Endless levels: each one harder, up to 3 ★ each')}</small></button>
        ${def.viz ? `<button class="btn ghost" data-act="free">${L('▶ Анимация', '▶ Animation')}<small>${L('Шаг за шагом, с псевдокодом и кодом на Python и JavaScript', 'Step by step, with pseudocode and Python and JavaScript code')}</small></button>`
          : `<button class="btn ghost" data-act="free">${L('♾ Свободная игра', '♾ Free play')}<small>${startParam && !qs.get('g') ? L('Рекорды этого чата', "This chat's records") : L('Личные рекорды', 'Personal records')}${best != null ? L(' · лучший: ', ' · best: ') + fmt(best) : ''}</small></button>`}
      </div>
      ${hubLink()}
      <div class="board"></div>`);
    bind(card, { levels: showLevels, free: freeAct });
    loadLevels().then(() => {
      const el = card.querySelector('.lvinfo');
      if (el) el.textContent = L(`Ты на уровне ${levels.unlocked} · ⭐ ${totalStars()} · уровни бесконечные`, `You're on level ${levels.unlocked} · ⭐ ${totalStars()} · levels never end`);
    }).catch(() => {});
    if (authed) api('top').then((d) => { card.querySelector('.board').innerHTML = boardHtml(d.top, d.group); }).catch(() => {});
  }

  function showEventMenu() {
    const card = show(`
      <div class="emoji">${meta.emoji}</div>
      <h1>${esc(meta.title)}</h1>
      <p>${esc(def.howto || meta.desc)}</p>
      <div class="ev"></div>
      <div class="row"><button class="btn" data-act="play">${L('▶ Играть', '▶ Play')}</button></div>
      <div class="board"></div>`);
    const playBtn = card.querySelector('[data-act=play]');
    const evBox = card.querySelector('.ev');
    const go = () => startRound({ mode: 'event', seedKey: eventKey, diff: 1 });
    bind(card, {
      play() {
        if (!event || !event.single) return go();
        playBtn.disabled = true;
        api('start').then(go).catch((e) => { evBox.innerHTML = `<div class="badge">${esc(e.message)}</div>`; });
      },
    });
    if (!authed) { evBox.innerHTML = `<p class="muted">${L('Режим с общим уровнем (отладка)', 'Shared-level mode (debug)')}</p>`; return; }
    if (!event) playBtn.disabled = true; // ждём правила события, иначе попытка дуэли не зачтётся
    api('top').then((d) => {
      event = d.event || null;
      card.querySelector('.board').innerHTML = boardHtml(d.top, d.group);
      if (event) {
        evBox.innerHTML = `<div class="badge">${esc(event.title)}</div><p class="muted">${esc(event.note)}</p>`;
        if (event.closed) { playBtn.remove(); return; }
      }
      playBtn.disabled = false;
    }).catch((e) => { evBox.innerHTML = `<p class="muted">${esc(e.message)}</p>`; playBtn.disabled = false; });
  }

  let lvPage = null;
  /** Карта уровней по главам: извилистая тропа из 10 уровней, испытания с иконкой, босс в конце */
  async function showLevels() {
    const card = show(`<div class="emoji">${meta.emoji}</div><h1 class="chtitle">${L('Уровни', 'Levels')}</h1><p class="lvsum">${L('Загружаю…', 'Loading…')}</p>
      <div class="lvnav"><button class="btn ghost" data-act="prev">◀</button><b class="pg"></b><button class="btn ghost" data-act="next">▶</button></div>
      <p class="chnews"></p>
      <div class="lvmap"></div>
      <p class="muted lvlegend"></p>
      <div class="row"><button class="btn ghost" data-act="menu">${L('← Назад', '← Back')}</button></div>`);
    try { await loadLevels(); } catch (e) { card.querySelector('.lvsum').textContent = e.message; bind(card, { menu: showMenu }); return; }
    const pages = Math.ceil(levels.levels.length / PAGE);
    if (lvPage === null || lvPage >= pages) lvPage = Math.floor((levels.unlocked - 1) / PAGE);
    const SHIFT = [0, 70, 110, 70, 0, -70, -110, -70, 0, 0]; // извилистая тропа, % ширины кружка
    const draw = () => {
      const c = lvPage + 1, list = levels.levels.slice(lvPage * PAGE, (lvPage + 1) * PAGE);
      const got = list.reduce((s2, l) => s2 + l.stars, 0), boss = list[PAGE - 1], cleared = boss && boss.stars > 0;
      card.querySelector('.chtitle').textContent = `${L('Глава', 'Chapter')} ${c} · ${chapterName(c)}`;
      card.querySelector('.lvsum').textContent = `⭐ ${got}/${PAGE * 3} ${L('в главе', 'in chapter')} · ${cleared ? L('👑 босс побеждён', '👑 boss defeated') : L('👑 победи босса: +50 XP', '👑 beat the boss: +50 XP')}`;
      card.querySelector('.pg').textContent = `${lvPage * PAGE + 1}–${(lvPage + 1) * PAGE}`;
      const news = def.chapters && def.chapters[c];
      card.querySelector('.chnews').textContent = news ? `🆕 ${L('Новое в главе', 'New in this chapter')}: ${news}` : '';
      card.querySelector('[data-act=prev]').disabled = lvPage === 0;
      card.querySelector('[data-act=next]').disabled = lvPage >= pages - 1;
      card.querySelector('.lvlegend').textContent = Object.values(MOD_INFO).map(([e, t]) => `${e} ${t.split(':')[0]}`).join(' · ');
      const map = card.querySelector('.lvmap');
      map.innerHTML = '';
      list.forEach((l, i) => {
        const open = l.n <= levels.unlocked, m = modOf(l.n);
        const b = document.createElement('button');
        b.className = 'lvl node' + (open ? '' : ' locked') + (l.n === levels.unlocked ? ' cur' : '') + (m === 'boss' ? ' boss' : '');
        b.style.borderColor = DIFF_COLORS[l.diff];
        b.style.transform = `translateX(${SHIFT[i]}%)`;
        const icon = m ? `<i class="md">${MOD_INFO[m][0]}</i>` : '';
        b.innerHTML = open
          ? `${icon}<b>${m === 'boss' ? '👑' : l.n}</b><span class="st">${starStr(l.stars)}</span><small>${fmt(l.goal)}</small>`
          : `${icon}<b>🔒</b><small>${l.n}</small>`;
        if (open) b.addEventListener('click', () => startRound(levelOpts(l.n)));
        else if (m) b.addEventListener('click', () => toastMsg(MOD_INFO[m][1]));
        map.appendChild(b);
      });
    };
    bind(card, {
      menu: showMenu,
      prev: () => { lvPage = Math.max(0, lvPage - 1); draw(); },
      next: () => { lvPage = Math.min(pages - 1, lvPage + 1); draw(); },
    });
    draw();
    const cur = card.querySelector('.cur');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  // ---------- конец раунда ----------
  function personalFree() { return opts.mode === 'free' && !eventKey && !(startParam && startParam.split('_').length === 3 && !qs.get('g')); }
  function tierGet() { return Math.min(4, Math.max(1, store.get('tier:' + gameId) || 2)); }
  /** После личной свободной партии: побил норму — ступень выше, сильно не дотянул — ниже */
  function tierUpdate(score) {
    if (!def.tiers || !personalFree() || score == null) return '';
    const t = tierGet(), par = meta.par, good = asc() ? score <= par : score >= par, bad = asc() ? score > par * 1.6 : score < par * 0.4;
    const nt = good ? Math.min(4, t + 1) : bad ? Math.max(1, t - 1) : t;
    store.set('tier:' + gameId, nt);
    return nt > t ? `<div class="badge">${L('⬆️ Следующая партия сложнее: ступень', '⬆️ Next round is harder: step')} ${nt}/4</div>` : nt < t ? `<p class="muted">${L('Следующая партия чуть проще: ступень', 'Next round is a bit easier: step')} ${nt}/4</p>` : `<p class="muted">${L('Сложность: ступень', 'Difficulty: step')} ${t}/4</p>`;
  }

  // ---------- «засиделся в телефоне»: после ~25 минут игры подряд предлагаем 3-минутную разминку ----------
  const BREAK_AFTER = 25 * 60 * 1000, SESSION_GAP = 10 * 60 * 1000;
  function sessionTick() {
    const now = Date.now();
    let s = store.get('session') || {};
    if (!s.start || now - (s.last || 0) > SESSION_GAP) s = { start: now, nudged: 0 };
    s.last = now;
    store.set('session', s);
    return s;
  }
  function breakNudge() {
    if (pref('breaks', true) === false || gameId.startsWith('fit-')) return '';
    const s = sessionTick(), now = Date.now();
    if (now - s.start < BREAK_AFTER || now - (s.nudged || 0) < BREAK_AFTER) return '';
    s.nudged = now; store.set('session', s);
    const mins = Math.round((now - s.start) / 60000);
    return `<div class="nudge">📵 ${L(`Ты в телефоне уже ${mins} мин. Разомнёмся 3 минуты? Шея, плечи, запястья — и глазам отдых.`, `You've been on your phone for ${mins} min. A 3-minute break? Neck, shoulders, wrists — and a rest for your eyes.`)}
      <a class="btn" href="play.html?g=fit-break">${L('🧘 Разминка', '🧘 Take a break')}</a></div>`;
  }

  function finish(score) {
    if (opts.mode === 'level') return finishLevel(score);
    const nudge = breakNudge();
    const tierNote = tierUpdate(score);
    const prev = opts.mode === 'event' ? null : store.get('best:' + gameId);
    const rec = opts.mode !== 'event' && score != null && (prev != null ? better(score, prev) : asc() || score > 0);
    if (rec) store.set('best:' + gameId, score);
    const single = event && event.single;
    haptic(rec ? 'success' : 'warning');
    const card = show(`
      <div class="emoji">${score === 42 && !asc() ? '🌌' : rec ? '🏆' : meta.emoji}</div>
      ${score === 42 && !asc() ? `<p class="muted">${L('42 — ответ на главный вопрос жизни, вселенной и всего такого', '42 — the answer to life, the universe and everything')}</p>` : ''}
      <h1>${L('Игра окончена', 'Game over')}</h1>
      <div class="big">${fmt(score)}</div>
      ${rec && prev != null ? `<div class="badge">${L('Новый личный рекорд!', 'New personal best!')}</div>` : ''}
      ${tierNote}
      ${nudge}
      ${relatedHtml()}
      <div class="progress"></div>
      <div class="board">${authed ? `<p class="muted">${L('Сохраняю результат…', 'Saving the result…')}</p>` : `<p class="muted">${L('Открой игру из Telegram, чтобы копить опыт и попадать в таблицы', 'Open the game from Telegram to earn XP and get on leaderboards')}</p>`}</div>
      <div class="row"><button class="btn ghost" data-act="menu">${L('Меню', 'Menu')}</button>${single ? '' : `<button class="btn" data-act="again">${L('↻ Ещё раз', '↻ Again')}</button>`}</div>`);
    bind(card, { again: () => startRound(opts), menu: showMenu });
    if (authed && score != null) {
      api('score', { score }).then((d) => {
        if (d.event) event = d.event;
        card.querySelector('.progress').innerHTML = progressHtml(d.progress);
        card.querySelector('.board').innerHTML =
          (d.chat_record && d.group && !event ? `<div class="badge">${L('Рекорд чата! Бот расскажет всем 😎', 'Chat record! The bot will tell everyone 😎')}</div>` : '') +
          (event ? `<p class="muted">${esc(event.note)}</p>` : '') +
          (d.rank ? `<p class="muted">${L('Место', 'Rank')}: ${d.rank}</p>` : '') + boardHtml(d.top, d.group);
        celebrate(d.progress);
      }).catch((e) => { card.querySelector('.board').innerHTML = `<p class="muted">${L('Не сохранилось', 'Not saved')}: ${esc(e.message)}</p>`; });
    }
  }

  function finishLevel(score) {
    const k = opts.level, goal = goalOf(k), nudge = breakNudge();
    const stars = score == null ? 0 : starsOf(k, score);
    const passed = stars > 0;
    haptic(passed ? 'success' : 'warning');
    let near = '';
    if (!passed && score != null) {
      const diff = asc() ? score - goal : goal - score;
      near = `<p>${L('До цели не хватило', 'Short of the goal by')}: <b>${meta.format === 'sec' ? (diff / 1000).toFixed(2) + L(' с', ' s') : diff + (meta.format === 'ms' ? L(' мс', ' ms') : '')}</b>. ${L('Ещё попытка?', 'Try again?')}</p>`;
    } else if (passed && stars < 3) {
      const g = asc() ? [goal, goal * 0.85, goal * 0.7] : [goal, goal * 1.25, goal * 1.5];
      near = `<p class="muted">${L('Для', 'For')} ${'★'.repeat(stars + 1)}: ${fmt(Math.ceil(g[stars]))}</p>`;
    }
    const card = show(`
      <div class="emoji">${passed ? (stars === 3 ? '🌟' : '✅') : '😤'}</div>
      <h1>${passed ? L(`Уровень ${k} пройден`, `Level ${k} cleared`) : L(`Уровень ${k} не пройден`, `Level ${k} failed`)}</h1>
      <div class="stars ${passed ? 'on' : ''}">${starStr(stars)}</div>
      <div class="big">${fmt(score)}</div>
      <p class="muted">${L('Цель', 'Goal')}: ${fmt(goal)} · ${DIFF_NAMES[diffOf(k)]} · ${L('скорость', 'speed')} ×${levelOpts(k).speed.toFixed(2)}${modOf(k) ? ' · ' + MOD_INFO[modOf(k)][0] : ''}</p>
      ${near}
      ${nudge}
      ${relatedHtml()}
      <div class="progress">${authed ? `<p class="muted">${L('Сохраняю…', 'Saving…')}</p>` : ''}</div>
      <div class="row"><button class="btn ghost" data-act="levels">${L('Уровни', 'Levels')}</button><button class="btn ${passed ? 'ghost' : ''}" data-act="again">${L('↻ Ещё раз', '↻ Again')}</button>
      ${passed ? `<button class="btn" data-act="next">${L('Дальше ▶', 'Next ▶')}</button>` : ''}</div>`);
    const nextK = k + 1;
    bind(card, {
      levels: showLevels,
      again: () => startRound(opts),
      next: () => { lvPage = null; startRound(levelOpts(nextK)); },
    });
    if (!authed) { if (score != null) saveLevelLocal(k, score); return; }
    if (score == null) { card.querySelector('.progress').innerHTML = ''; return; }
    api('level', { level: k, score }).then((d) => {
      levels = { unlocked: d.unlocked, levels: d.levels };
      card.querySelector('.progress').innerHTML =
        (d.progress.chapter_clear ? `<div class="badge">👑 ${L(`Босс побеждён! Глава ${d.progress.chapter_clear} пройдена · +50 XP`, `Boss defeated! Chapter ${d.progress.chapter_clear} complete · +50 XP`)}</div>` : '') +
        (d.progress.unlocked ? `<div class="badge">🔓 ${L('Открыт уровень', 'Unlocked level')} ${d.progress.unlocked}</div>` : '') + progressHtml(d.progress);
      celebrate(d.progress);
    }).catch((e) => { card.querySelector('.progress').innerHTML = `<p class="muted">${L('Не сохранилось', 'Not saved')}: ${esc(e.message)}</p>`; });
  }

  function celebrate(p) {
    if (!p) return;
    if (p.level_up || p.daily_completed || (p.achievements || []).length) {
      haptic('success'); tone(660, 90); setTimeout(() => tone(880, 90), 110); setTimeout(() => tone(1175, 160), 220);
    }
  }

  // ---------- раунд и api для игр ----------
  function startRound(o) {
    sessionTick();
    opts = Object.assign({ mode: 'free' }, o);
    if (round) round.dispose();
    overlay.hidden = true;
    stage.innerHTML = '';
    hud.timer.hidden = true;
    hud.timer.classList.remove('low');
    hud.score.hidden = opts.mode === 'app';
    setHudTitle();
    round = makeApi(opts);
    round.setScore(asc() ? null : 0);
    // новая механика главы — в начале главы; модификатор испытания — на его уровне
    const news = opts.mode === 'level' && def.chapters && (opts.level - 1) % PAGE === 0 ? def.chapters[round.chapter] : null;
    if (news) round.toast('🆕 ' + news, 3500);
    else if (opts.mode === 'level' && opts.mod) round.toast(MOD_INFO[opts.mod].join(' '));
    const cleanup = def.start(round);
    if (typeof cleanup === 'function') round.onDispose(cleanup);
  }

  function makeApi(o) {
    const cleanups = [];
    let score = 0, ended = false;
    // уровни и события: каждый раунд с одного и того же зерна → тот же расклад
    const R = o.seedKey ? seededRng(gameId + ':' + o.seedKey) : Math.random;
    const diff = o.diff == null ? 1 : o.diff;
    const sf = o.speed || 1, tf = o.time || 1;
    const disposeAll = () => { while (cleanups.length) try { cleanups.pop()(); } catch (e) { console.error(e); } };

    const a = {
      stage, haptic, tone, fmt, gameId,
      mode: o.mode, level: o.level || 0, difficulty: diff,
      /** Главы уровней: номер главы (1, 2…), модификатор испытания ('fast' | 'rush' | 'sharp' | 'boss' | null) — игры добавляют новые механики по главам */
      chapter: o.level ? Math.floor((o.level - 1) / PAGE) + 1 : 1, mod: o.mod || null, boss: o.mod === 'boss',
      /** Ступень сложности 1–4 для одиночных головоломок: в личной свободной игре растёт с успехами, в чатах/турнирах/уровнях — стандартная 2 */
      tier: personalFree() ? tierGet() : 2,
      isEvent: o.mode === 'event',
      authed, isGroup: !!(startParam && startParam.split('_')[1] && startParam.split('_')[1][0] === 'm' && !qs.get('g')),
      /** Приложения: отправить картинку/текст. send: 'chat' — бот пришлёт в этот чат, 'any' — выбрать любой чат, 'none' — только сохранить */
      async share(p) {
        if (!authed) throw new Error(L('Открой из Telegram, чтобы отправлять в чат', 'Open from Telegram to send to the chat'));
        const d = await api('share', p);
        if (p.send === 'any') {
          if (d.prepared && tg && tg.shareMessage) tg.shareMessage(d.prepared);
          else throw new Error(L('Пересылка в любой чат недоступна — используй «В этот чат»', 'Sharing to any chat is unavailable — use “To this chat”'));
        }
        return d;
      },
      /** Сохранить картинку файлом (в Telegram — через downloadFile, иначе обычная загрузка) */
      async save(dataUrl, filename) {
        if (inTg && tg.downloadFile) {
          const d = await api('share', { kind: 'image', image: dataUrl, send: 'none' });
          tg.downloadFile({ url: d.url, file_name: filename });
          return;
        }
        const el = document.createElement('a'); el.href = dataUrl; el.download = filename; el.click();
      },
      /** Честный жребий на сервере (бот сам публикует результат в чат) */
      roll(p) { return authed ? api('roll', p) : Promise.reject(new Error(L('Открой из Telegram, чтобы жребий был честным и попал в чат', 'Open from Telegram so the draw is fair and posted to the chat'))); },
      /** Панель отправки: image() → dataURL PNG или text() → строка */
      shareBar(parent, { image, text, filename = 'arcade.png' }) {
        // для пересылки — JPEG на белом фоне (Telegram принимает в подготовленных сообщениях только JPEG), для файла — PNG
        const jpeg = () => {
          const src = new Image(), url = image();
          return new Promise((res) => {
            src.onload = () => {
              const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
              const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0);
              res(c.toDataURL('image/jpeg', 0.9));
            };
            src.src = url;
          });
        };
        const bar = a.el('div', 'toolbar', parent);
        const run = async (btn, fn) => {
          btn.disabled = true;
          try { await fn(); } catch (e) { a.toast(e.message); } finally { btn.disabled = false; }
        };
        if (image) {
          const s = a.el('button', 'btn ghost', bar, L('💾 Сохранить', '💾 Save'));
          a.on(s, 'click', () => run(s, async () => { await a.save(image(), filename); a.toast(L('Сохраняю файл…', 'Saving the file…')); }));
        }
        const c = a.el('button', 'btn', bar, L('📤 В этот чат', '📤 To this chat'));
        a.on(c, 'click', () => run(c, async () => {
          const d = await a.share(image ? { kind: 'image', image: await jpeg(), send: 'chat' } : { kind: 'text', text: text(), send: 'chat' });
          a.toast(d.sent ? (d.group ? L('Отправил в чат ✅', 'Sent to the chat ✅') : L('Отправил тебе в личку ✅', 'Sent to your private chat ✅')) : L('Сохранено', 'Saved'));
          a.haptic('success');
        }));
        const any = a.el('button', 'btn ghost', bar, L('↗️ В любой чат', '↗️ To any chat'));
        a.on(any, 'click', () => run(any, async () => a.share(image ? { kind: 'image', image: await jpeg(), send: 'any' } : { kind: 'text', text: text(), send: 'any' })));
        return bar;
      },
      toast: toastMsg,
      /** Пасхалка из игры (код из белого списка сервера) — засчитывается один раз */
      egg(code) {
        if (!authed) return;
        api('egg', { code }).then((d) => { if (d.achievement) toastMsg(`🥚 ${L('Пасхалка найдена', 'Easter egg found')}: ${d.achievement.emoji} ${d.achievement.title}`, 3500); }).catch(() => {});
      },
      colors: colors(),
      get score() { return score; },
      get ended() { return ended; },
      get W() { return stage.clientWidth; },
      get H() { return stage.clientHeight; },

      setScore(n) { score = n; hud.score.textContent = n == null ? '' : fmt(n); },
      addScore(d = 1) { a.setScore((score || 0) + d); },
      /** Конец раунда. Без аргумента — текущий счёт. */
      end(final) {
        if (ended) return;
        ended = true;
        disposeAll();
        finish(final === undefined ? score : final);
      },
      dispose() { ended = true; disposeAll(); },
      /** Выйти в меню без результата (например, из режима заучивания). */
      quit() {
        if (ended) return;
        ended = true;
        disposeAll();
        hud.timer.hidden = true;
        showMenu();
      },
      onDispose(fn) { cleanups.push(fn); },

      on(el, type, fn, op) { el.addEventListener(type, fn, op); cleanups.push(() => el.removeEventListener(type, fn, op)); },
      /** rAF-цикл: fn(dt в секундах, t). Сложность меняет скорость времени игры. */
      loop(fn) {
        let last = performance.now(), id = 0;
        const f = (t) => {
          if (ended) return;
          const dt = Math.min(0.05, (t - last) / 1000) * sf; last = t;
          fn(dt, t);
          if (!ended) id = requestAnimationFrame(f);
        };
        id = requestAnimationFrame(f);
        cleanups.push(() => cancelAnimationFrame(id));
      },
      /** setTimeout с автоочисткой; возвращает функцию отмены */
      after(ms, fn) {
        const id = setTimeout(() => { if (!ended) fn(); }, ms);
        const cancel = () => clearTimeout(id);
        cleanups.push(cancel);
        return cancel;
      },
      every(ms, fn) {
        const id = setInterval(() => { if (!ended) fn(); }, ms);
        const cancel = () => clearInterval(id);
        cleanups.push(cancel);
        return cancel;
      },
      /** Обратный отсчёт в HUD (сложность меняет время). По нулю — onDone() или api.end(). */
      timer(sec, onDone) {
        let left = sec * tf * 1000, last = performance.now(), done = false;
        hud.timer.hidden = false;
        const draw = () => {
          hud.timer.textContent = Math.ceil(left / 1000) + L('с', 's');
          hud.timer.classList.toggle('low', left <= 5000);
        };
        draw();
        a.every(100, () => {
          if (done) return;
          const n = performance.now(); left -= n - last; last = n;
          if (left <= 0) { left = 0; done = true; draw(); (onDone || (() => a.end()))(); } else draw();
        });
        return {
          add(s) { left = Math.max(0, left + (s < 0 ? s * (o.penalty || 1) : s) * 1000); draw(); }, // «дорогие ошибки» удваивают штраф
          get left() { return left / 1000; },
        };
      },

      /** Холст на всю сцену с учётом DPR. Возвращает {c, ctx, W, H} — W/H обновляются при ресайзе. */
      canvas() {
        const c = document.createElement('canvas');
        stage.appendChild(c);
        const g = { c, ctx: c.getContext('2d'), W: 0, H: 0 };
        const fit = () => {
          const d = window.devicePixelRatio || 1;
          g.W = stage.clientWidth; g.H = stage.clientHeight;
          c.width = Math.round(g.W * d); c.height = Math.round(g.H * d);
          c.style.width = g.W + 'px'; c.style.height = g.H + 'px';
          g.ctx.setTransform(d, 0, 0, d, 0, 0);
        };
        fit();
        a.on(window, 'resize', fit);
        return g;
      },
      /** Координаты события относительно сцены */
      pos(e) {
        const r = stage.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      },
      /** Тап/клик по сцене: fn(x, y, e) */
      onTap(fn) { a.on(stage, 'pointerdown', (e) => { const p = a.pos(e); fn(p.x, p.y, e); }); },
      /** Тап по сцене или пробел/Enter */
      onAction(fn) {
        a.on(stage, 'pointerdown', (e) => fn(e));
        a.on(window, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); fn(e); } });
      },
      /** Свайпы (несколько за одно касание) + стрелки/WASD: fn('up'|'down'|'left'|'right') */
      onSwipe(fn, threshold = 22) {
        let sx = 0, sy = 0, active = false;
        a.on(stage, 'pointerdown', (e) => { sx = e.clientX; sy = e.clientY; active = true; });
        a.on(stage, 'pointermove', (e) => {
          if (!active) return;
          const dx = e.clientX - sx, dy = e.clientY - sy;
          if (Math.hypot(dx, dy) < threshold) return;
          sx = e.clientX; sy = e.clientY;
          fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        });
        a.on(window, 'pointerup', () => { active = false; });
        a.on(window, 'pointercancel', () => { active = false; });
        const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
        a.on(window, 'keydown', (e) => { const d = keys[e.code]; if (d) { e.preventDefault(); fn(d); } });
      },
      /** Зажатые клавиши: api.keys().ArrowLeft */
      keys() {
        const k = {};
        a.on(window, 'keydown', (e) => { k[e.code] = true; });
        a.on(window, 'keyup', (e) => { k[e.code] = false; });
        return k;
      },

      // DOM-хелпер
      el(tag, cls, parent, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        (parent || stage).appendChild(n);
        return n;
      },
      shake(n) { if (!pref('motion', true)) return; n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); },
      // рисование
      rr(x, X, Y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
        x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
      },
      // случайности — только через них, чтобы работали уровни и общее зерно турниров
      rand: (lo = 0, hi = 1) => lo + R() * (hi - lo),
      randi: (n) => Math.floor(R() * n),
      pick: (arr) => arr[Math.floor(R() * arr.length)],
      shuffle(arr) { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; },
      clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    };
    return a;
  }

  // ---------- загрузка ----------
  window.Arcade = {
    /** Игра не смогла загрузиться (нет данных/сети) — показать понятную ошибку вместо пустого экрана */
    fail(msg) {
      show(`<div class="emoji">⚠️</div><h1>${L('Не загрузилось', "Didn't load")}</h1><p>${esc(msg)}</p><div class="row"><button class="btn" onclick="location.reload()">${L('↻ Повторить', '↻ Retry')}</button></div>`);
    },
    register(d) {
      def = d;
      if (def.app || meta.app) { // приложение: сразу открываем, без меню, очков и уровней
        hud.score.hidden = true;
        startRound({ mode: 'app' });
      } else showMenu();
    },
  };

  (async () => {
    try {
      const cat = await (await fetch('games/catalog.json', { cache: 'no-cache' })).json();
      meta = localize(cat.games.find((g) => g.id === gameId));
      CAT = cat;
    } catch (e) { /* ниже покажем ошибку */ }
    if (!meta) {
      show(`<div class="emoji">🤷</div><h1>${L('Игра не найдена', 'Game not found')}</h1><p>${L('Открой игру из каталога бота.', "Open a game from the bot's catalog.")}</p><a class="hublink" href="hub.html">${L('🧠 В профиль', '🧠 To profile')}</a>`);
      return;
    }
    meta.par = meta.par || 10;
    document.title = meta.title;
    setHudTitle();
    const s = document.createElement('script');
    s.src = 'games/' + gameId + '.js?v=' + (window.ARCADE_BUILD || ''); // версия сборки — чтобы Telegram не держал старый файл
    s.onerror = () => show(`<div class="emoji">⚠️</div><h1>${L('Не загрузилась', "Didn't load")}</h1><p>${L('Попробуй позже.', 'Try again later.')}</p>`);
    document.body.appendChild(s);
  })();
})();
