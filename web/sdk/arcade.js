/* Аркада SDK: всё общее для мини-игр (Telegram, HUD, меню, уровни, рекорды, прогресс, ввод, холст).
 *
 * Игра — один файл web/games/<id>.js:
 *   Arcade.register({
 *     howto: 'Как играть',
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

  const PAGE = 12; // уровней на странице; сами уровни бесконечные
  const DIFF_NAMES = ['Лёгкая', 'Обычная', 'Сложная', 'Экстрим'];
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
  let meta = null, def = null, round = null, opts = { mode: 'free' }, levels = null;

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
    if (meta.format === 'ms') return v + ' мс';
    if (meta.format === 'sec') return (v / 1000).toFixed(2) + ' с';
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
  const goalOf = (k) => Math.max(1, Math.floor(meta.par * factorOf(k) + 0.5));
  const starsOf = (k, s) => {
    const g = goalOf(k);
    return asc() ? [g, g * 0.85, g * 0.7].filter((t) => s <= t).length : [g, g * 1.25, g * 1.5].filter((t) => s >= t).length;
  };
  const diffOf = (k) => (k <= 3 ? 0 : k <= 8 ? 1 : k <= 20 ? 2 : 3);
  const levelOpts = (k) => ({ mode: 'level', level: k, diff: diffOf(k), speed: speedOf(k), time: timeOf(k), seedKey: 'lvl' + k });
  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('arcade:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('arcade:' + k, JSON.stringify(v)); } catch (e) { /* noop */ } },
  };

  async function api(path, body) {
    const r = await fetch(new URL('api/' + path, location.href), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ initData, ctx, tz: TZ }, body)),
    });
    if (!r.ok) {
      let msg = 'Ошибка ' + r.status;
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
      levels: [...Array(last)].map((_, i) => ({ n: i + 1, goal: goalOf(i + 1), diff: diffOf(i + 1), stars: (saved[i + 1] || {}).stars || 0, best: (saved[i + 1] || {}).best })),
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

  // ---------- оверлеи ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function boardHtml(top, group) {
    if (!top || !top.length) return event ? '' : '<p class="muted">Таблица пуста — будь первым!</p>';
    const label = event ? (event.kind === 'duel' ? 'Дуэль' : 'Таблица турнира') : group ? 'Рекорды чата' : 'Твои рекорды';
    return `<p class="muted">${label}</p><ol class="lb">` + top.map((r, i) =>
      `<li class="${r.me ? 'me' : ''}"><span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="nm">${esc(r.name)}</span><span class="sc">${fmt(r.score)}</span></li>`
    ).join('') + '</ol>';
  }
  function progressHtml(p) {
    if (!p) return '';
    const span = Math.max(1, p.xp_next - p.xp_start), have = p.xp_total - p.xp_start;
    const notes = [];
    if (p.in_daily) notes.push('🎯 тренировка дня');
    if (p.record) notes.push('📈 рекорд');
    if (p.variety < 1) notes.push('↘ повтор: другие игры дают больше');
    let html = `<div class="prog"><div class="xp">+${p.xp} XP${notes.length ? ' · ' + notes.join(' · ') : ''}</div>
      <div class="bar"><i style="width:${Math.min(100, (have / span) * 100)}%"></i></div>
      <div class="muted">Уровень ${p.level} · ${esc(p.title)} · ${have}/${span}</div>`;
    if (p.level_up) html += `<div class="badge">🎉 Новый уровень профиля: ${p.level}!</div>`;
    if (p.daily_completed) html += '<div class="badge">🔥 Тренировка дня завершена!</div>';
    else if (p.in_daily) html += `<div class="muted">Тренировка дня: ${p.daily.count}/${p.daily.games.length}</div>`;
    for (const a of p.achievements || []) html += `<div class="ach-new">${a.emoji} <b>${esc(a.title)}</b><small>${esc(a.desc)} · +25 XP</small></div>`;
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
  const hubLink = () => (authed ? '<a class="hublink" href="hub.html">🧠 Профиль и тренировка дня</a>' : '');

  function setHudTitle() {
    hud.title.textContent = opts.mode === 'level'
      ? `${meta.emoji} Ур. ${opts.level} · цель ${fmt(goalOf(opts.level))}`
      : meta.emoji + ' ' + meta.title;
  }

  // ---------- меню ----------
  let firstMenu = true;
  function showMenu() {
    if (def.app || meta.app) return startRound({ mode: 'app' });
    opts = { mode: 'free' };
    setHudTitle();
    if (eventKey) return showEventMenu();
    if (firstMenu) { // настройка «при открытии игры»
      firstMenu = false;
      if (pref('open_mode', 'menu') === 'levels') return showLevels();
      if (pref('open_mode', 'menu') === 'free') return startRound({ mode: 'free' });
    }
    const best = store.get('best:' + gameId);
    const card = show(`
      <div class="emoji">${meta.emoji}</div>
      <h1>${esc(meta.title)}</h1>
      <p class="howto">${esc(def.howto || meta.desc)}</p>
      <div class="modes">
        <button class="btn" data-act="levels">🎯 Уровни<small class="lvinfo">Бесконечные уровни: каждый новый сложнее, до 3 ★ за каждый</small></button>
        <button class="btn ghost" data-act="free">♾ Свободная игра<small>${startParam && !qs.get('g') ? 'Рекорды этого чата' : 'Личные рекорды'}${best != null ? ' · лучший: ' + fmt(best) : ''}</small></button>
      </div>
      ${hubLink()}
      <div class="board"></div>`);
    bind(card, { levels: showLevels, free: () => startRound({ mode: 'free' }) });
    loadLevels().then(() => {
      const el = card.querySelector('.lvinfo');
      if (el) el.textContent = `Ты на уровне ${levels.unlocked} · ⭐ ${totalStars()} · уровни бесконечные`;
    }).catch(() => {});
    if (authed) api('top').then((d) => { card.querySelector('.board').innerHTML = boardHtml(d.top, d.group); }).catch(() => {});
  }

  function showEventMenu() {
    const card = show(`
      <div class="emoji">${meta.emoji}</div>
      <h1>${esc(meta.title)}</h1>
      <p>${esc(def.howto || meta.desc)}</p>
      <div class="ev"></div>
      <div class="row"><button class="btn" data-act="play">▶ Играть</button></div>
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
    if (!authed) { evBox.innerHTML = '<p class="muted">Режим с общим уровнем (отладка)</p>'; return; }
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
  async function showLevels() {
    const card = show(`<div class="emoji">${meta.emoji}</div><h1>Уровни</h1><p class="lvsum">Загружаю…</p>
      <div class="lvnav"><button class="btn ghost" data-act="prev">◀</button><b class="pg"></b><button class="btn ghost" data-act="next">▶</button></div>
      <div class="levels"></div>
      <p class="muted"><span style="color:${DIFF_COLORS[0]}">●</span> лёгкие 1–3 · <span style="color:${DIFF_COLORS[1]}">●</span> обычные 4–8 · <span style="color:${DIFF_COLORS[2]}">●</span> сложные 9–20 · <span style="color:${DIFF_COLORS[3]}">●</span> экстрим 21+</p>
      <div class="row"><button class="btn ghost" data-act="menu">← Назад</button></div>`);
    try { await loadLevels(); } catch (e) { card.querySelector('.lvsum').textContent = e.message; bind(card, { menu: showMenu }); return; }
    const pages = Math.ceil(levels.levels.length / PAGE);
    if (lvPage === null || lvPage >= pages) lvPage = Math.floor((levels.unlocked - 1) / PAGE);
    const draw = () => {
      card.querySelector('.lvsum').textContent = `⭐ ${totalStars()} · открыт уровень ${levels.unlocked}. Набери цель — откроется следующий.`;
      card.querySelector('.pg').textContent = `${lvPage * PAGE + 1}–${(lvPage + 1) * PAGE}`;
      card.querySelector('[data-act=prev]').disabled = lvPage === 0;
      card.querySelector('[data-act=next]').disabled = lvPage >= pages - 1;
      const grid = card.querySelector('.levels');
      grid.innerHTML = '';
      for (const l of levels.levels.slice(lvPage * PAGE, (lvPage + 1) * PAGE)) {
        const open = l.n <= levels.unlocked;
        const b = document.createElement('button');
        b.className = 'lvl' + (open ? '' : ' locked') + (l.n === levels.unlocked ? ' cur' : '');
        b.style.borderColor = DIFF_COLORS[l.diff];
        b.innerHTML = open
          ? `<b>${l.n}</b><span class="st">${starStr(l.stars)}</span><small>${fmt(l.goal)}</small>`
          : `<b>🔒</b><small>${l.n}</small>`;
        if (open) b.addEventListener('click', () => startRound(levelOpts(l.n)));
        grid.appendChild(b);
      }
    };
    bind(card, {
      menu: showMenu,
      prev: () => { lvPage = Math.max(0, lvPage - 1); draw(); },
      next: () => { lvPage = Math.min(pages - 1, lvPage + 1); draw(); },
    });
    draw();
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
    return nt > t ? `<div class="badge">⬆️ Следующая партия сложнее: ступень ${nt}/4</div>` : nt < t ? `<p class="muted">Следующая партия чуть проще: ступень ${nt}/4</p>` : `<p class="muted">Сложность: ступень ${t}/4</p>`;
  }

  function finish(score) {
    if (opts.mode === 'level') return finishLevel(score);
    const tierNote = tierUpdate(score);
    const prev = opts.mode === 'event' ? null : store.get('best:' + gameId);
    const rec = opts.mode !== 'event' && score != null && (prev != null ? better(score, prev) : asc() || score > 0);
    if (rec) store.set('best:' + gameId, score);
    const single = event && event.single;
    haptic(rec ? 'success' : 'warning');
    const card = show(`
      <div class="emoji">${rec ? '🏆' : meta.emoji}</div>
      <h1>Игра окончена</h1>
      <div class="big">${fmt(score)}</div>
      ${rec && prev != null ? '<div class="badge">Новый личный рекорд!</div>' : ''}
      ${tierNote}
      <div class="progress"></div>
      <div class="board">${authed ? '<p class="muted">Сохраняю результат…</p>' : '<p class="muted">Открой игру из Telegram, чтобы копить опыт и попадать в таблицы</p>'}</div>
      <div class="row"><button class="btn ghost" data-act="menu">Меню</button>${single ? '' : '<button class="btn" data-act="again">↻ Ещё раз</button>'}</div>`);
    bind(card, { again: () => startRound(opts), menu: showMenu });
    if (authed && score != null) {
      api('score', { score }).then((d) => {
        if (d.event) event = d.event;
        card.querySelector('.progress').innerHTML = progressHtml(d.progress);
        card.querySelector('.board').innerHTML =
          (d.chat_record && d.group && !event ? '<div class="badge">Рекорд чата! Бот расскажет всем 😎</div>' : '') +
          (event ? `<p class="muted">${esc(event.note)}</p>` : '') +
          (d.rank ? `<p class="muted">Место: ${d.rank}</p>` : '') + boardHtml(d.top, d.group);
        celebrate(d.progress);
      }).catch((e) => { card.querySelector('.board').innerHTML = `<p class="muted">Не сохранилось: ${esc(e.message)}</p>`; });
    }
  }

  function finishLevel(score) {
    const k = opts.level, goal = goalOf(k);
    const stars = score == null ? 0 : starsOf(k, score);
    const passed = stars > 0;
    haptic(passed ? 'success' : 'warning');
    let near = '';
    if (!passed && score != null) {
      const diff = asc() ? score - goal : goal - score;
      near = `<p>До цели не хватило: <b>${meta.format === 'sec' ? (diff / 1000).toFixed(2) + ' с' : diff + (meta.format === 'ms' ? ' мс' : '')}</b>. Ещё попытка?</p>`;
    } else if (passed && stars < 3) {
      const g = asc() ? [goal, goal * 0.85, goal * 0.7] : [goal, goal * 1.25, goal * 1.5];
      near = `<p class="muted">Для ${'★'.repeat(stars + 1)}: ${fmt(Math.ceil(g[stars]))}</p>`;
    }
    const card = show(`
      <div class="emoji">${passed ? (stars === 3 ? '🌟' : '✅') : '😤'}</div>
      <h1>Уровень ${k} ${passed ? 'пройден' : 'не пройден'}</h1>
      <div class="stars ${passed ? 'on' : ''}">${starStr(stars)}</div>
      <div class="big">${fmt(score)}</div>
      <p class="muted">Цель: ${fmt(goal)} · ${DIFF_NAMES[diffOf(k)]} · скорость ×${speedOf(k).toFixed(2)}</p>
      ${near}
      <div class="progress">${authed ? '<p class="muted">Сохраняю…</p>' : ''}</div>
      <div class="row"><button class="btn ghost" data-act="levels">Уровни</button><button class="btn ${passed ? 'ghost' : ''}" data-act="again">↻ Ещё раз</button>
      ${passed ? '<button class="btn" data-act="next">Дальше ▶</button>' : ''}</div>`);
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
        (d.progress.unlocked ? `<div class="badge">🔓 Открыт уровень ${d.progress.unlocked}</div>` : '') + progressHtml(d.progress);
      celebrate(d.progress);
    }).catch((e) => { card.querySelector('.progress').innerHTML = `<p class="muted">Не сохранилось: ${esc(e.message)}</p>`; });
  }

  function celebrate(p) {
    if (!p) return;
    if (p.level_up || p.daily_completed || (p.achievements || []).length) {
      haptic('success'); tone(660, 90); setTimeout(() => tone(880, 90), 110); setTimeout(() => tone(1175, 160), 220);
    }
  }

  // ---------- раунд и api для игр ----------
  function startRound(o) {
    opts = Object.assign({ mode: 'free' }, o);
    if (round) round.dispose();
    overlay.hidden = true;
    stage.innerHTML = '';
    hud.timer.hidden = true;
    hud.timer.classList.remove('low');
    setHudTitle();
    round = makeApi(opts);
    round.setScore(asc() ? null : 0);
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
      /** Ступень сложности 1–4 для одиночных головоломок: в личной свободной игре растёт с успехами, в чатах/турнирах/уровнях — стандартная 2 */
      tier: personalFree() ? tierGet() : 2,
      isEvent: o.mode === 'event',
      authed, isGroup: !!(startParam && startParam.split('_')[1] && startParam.split('_')[1][0] === 'm' && !qs.get('g')),
      /** Приложения: отправить картинку/текст. send: 'chat' — бот пришлёт в этот чат, 'any' — выбрать любой чат, 'none' — только сохранить */
      async share(p) {
        if (!authed) throw new Error('Открой из Telegram, чтобы отправлять в чат');
        const d = await api('share', p);
        if (p.send === 'any') {
          if (d.prepared && tg && tg.shareMessage) tg.shareMessage(d.prepared);
          else throw new Error('Пересылка в любой чат недоступна — используй «В этот чат»');
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
      roll(p) { return authed ? api('roll', p) : Promise.reject(new Error('Открой из Telegram, чтобы жребий был честным и попал в чат')); },
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
          const s = a.el('button', 'btn ghost', bar, '💾 Сохранить');
          a.on(s, 'click', () => run(s, async () => { await a.save(image(), filename); a.toast('Сохраняю файл…'); }));
        }
        const c = a.el('button', 'btn', bar, '📤 В этот чат');
        a.on(c, 'click', () => run(c, async () => {
          const d = await a.share(image ? { kind: 'image', image: await jpeg(), send: 'chat' } : { kind: 'text', text: text(), send: 'chat' });
          a.toast(d.sent ? (d.group ? 'Отправил в чат ✅' : 'Отправил тебе в личку ✅') : 'Сохранено');
          a.haptic('success');
        }));
        const any = a.el('button', 'btn ghost', bar, '↗️ В любой чат');
        a.on(any, 'click', () => run(any, async () => a.share(image ? { kind: 'image', image: await jpeg(), send: 'any' } : { kind: 'text', text: text(), send: 'any' })));
        return bar;
      },
      toast(msg, ms = 2200) {
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), ms);
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
          hud.timer.textContent = Math.ceil(left / 1000) + 'с';
          hud.timer.classList.toggle('low', left <= 5000);
        };
        draw();
        a.every(100, () => {
          if (done) return;
          const n = performance.now(); left -= n - last; last = n;
          if (left <= 0) { left = 0; done = true; draw(); (onDone || (() => a.end()))(); } else draw();
        });
        return {
          add(s) { left = Math.max(0, left + s * 1000); draw(); },
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
      show(`<div class="emoji">⚠️</div><h1>Не загрузилось</h1><p>${esc(msg)}</p><div class="row"><button class="btn" onclick="location.reload()">↻ Повторить</button></div>`);
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
      meta = cat.games.find((g) => g.id === gameId);
    } catch (e) { /* ниже покажем ошибку */ }
    if (!meta) {
      show('<div class="emoji">🤷</div><h1>Игра не найдена</h1><p>Открой игру из каталога бота.</p><a class="hublink" href="hub.html">🧠 В профиль</a>');
      return;
    }
    meta.par = meta.par || 10;
    document.title = meta.title;
    setHudTitle();
    const s = document.createElement('script');
    s.src = 'games/' + gameId + '.js?v=' + (window.ARCADE_BUILD || ''); // версия сборки — чтобы Telegram не держал старый файл
    s.onerror = () => show('<div class="emoji">⚠️</div><h1>Не загрузилась</h1><p>Попробуй позже.</p>');
    document.body.appendChild(s);
  })();
})();
