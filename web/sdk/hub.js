/* Хаб Mini App: тренировка дня, каталог с прогрессом, профиль (уровень, навыки, ачивки, напоминания), «наука». */
(() => {
  'use strict';
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.initData);
  const qs = new URLSearchParams(location.search);
  const devAuth = !inTg && qs.has('dev');
  const authed = inTg || devAuth;
  const initData = inTg ? tg.initData : 'dev';
  const TZ = new Date().getTimezoneOffset();
  const devQ = devAuth ? '&dev' : '';

  if (tg) {
    try { tg.ready(); tg.expand(); if (tg.BackButton) tg.BackButton.hide(); } catch (e) { /* noop */ }
    const p = tg.themeParams || {};
    const map = { bg: p.bg_color, card: p.secondary_bg_color, fg: p.text_color, hint: p.hint_color, accent: p.button_color, 'accent-fg': p.button_text_color };
    for (const [k, v] of Object.entries(map)) if (v) document.documentElement.style.setProperty('--' + k, v);
  }
  if (window.ArcadePrefs) window.ArcadePrefs.apply();
  const haptic = (k) => { if (window.ArcadePrefs && !window.ArcadePrefs.get('haptics')) return; try { tg && tg.HapticFeedback && (k === 'select' ? tg.HapticFeedback.selectionChanged() : tg.HapticFeedback.impactOccurred('light')); } catch (e) { /* noop */ } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const view = document.getElementById('view');

  async function api(path, body) {
    const r = await fetch(new URL('api/' + path, location.href), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ initData, tz: TZ, lang: LANG }, body || {})),
    });
    if (!r.ok) { let m = L('Ошибка ', 'Error ') + r.status; try { m = (await r.json()).detail || m; } catch (e) { /* noop */ } throw new Error(m); }
    return r.json();
  }

  let cat = null, prof = null, tab = 'today', sectionFilter = 'all', season = '';
  const game = (id) => cat.games.find((g) => g.id === id);
  const skill = (id) => cat.skills.find((s) => s.id === id);
  const playUrl = (id) => `play.html?g=${id}&from=hub${devQ}`;
  const bar = (have, span) => `<div class="bar"><i style="width:${Math.min(100, (have / Math.max(1, span)) * 100)}%"></i></div>`;

  const TIPS = L([
    'Разнообразие важнее повторения: навыки, которые ты качаешь реже, дают больше опыта.',
    'Короткие ежедневные занятия эффективнее редких длинных — поэтому тренировка дня всего ~5 минут.',
    'Сон, движение и общение — не менее важная часть «тренировки мозга», чем игры.',
    'Карточки в «Учёбе» возвращаются через 1, 3, 7, 14 и 30 дней: так запоминается надёжнее.',
    'Сложность растёт вместе с тобой: уровни 9–12 — это уже настоящий вызов.',
    'Новый навык, который даётся с трудом, — лучший стимул для памяти. Попробуй незнакомую игру.',
  ], [
    'Variety beats repetition: skills you train less often give more XP.',
    'Short daily sessions work better than rare long ones — that is why the daily workout is only ~5 minutes.',
    'Sleep, exercise and talking to people matter for your brain as much as games do.',
    'Study cards come back after 1, 3, 7, 14 and 30 days: that is how memories stick.',
    'Difficulty grows with you: levels 9–12 are a real challenge.',
    'A new skill that feels hard is the best boost for memory. Try a game you have never played.',
  ]);

  // ---------- вкладки ----------
  function today() {
    if (!prof) return guest();
    const d = prof.daily, s = prof.streak;
    const next = d.games.find((g) => !g.done);
    const lvSpan = prof.xp_next - prof.xp_start, lvHave = prof.xp - prof.xp_start;
    const tip = TIPS[(new Date().getDate()) % TIPS.length];
    return `
      <div class="hello">${avatarHtml()}
        <div class="who"><b>${L('Привет', 'Hi')}, ${esc(myName().split(' ')[0])}!</b><span class="chip">${L('Ур.', 'Lv.')} ${prof.level} · ${esc(prof.title)}</span>
        ${bar(lvHave, lvSpan)}<small class="muted" style="margin:0">${lvHave} / ${lvSpan} ${L('XP до уровня', 'XP to level')} ${prof.level + 1}</small></div></div>
      <div class="panel"><div class="tip">${esc((cat.mission || {})[LANG] || '')}</div>${pillarsToday()}</div>
      <div class="panel streak">
        <div class="fire ${s.current ? '' : 'off'}">🔥</div>
        <div><b>${s.current}</b> ${L(plural(s.current, 'день', 'дня', 'дней') + ' подряд', (s.current === 1 ? 'day' : 'days') + ' in a row')}
          <div class="muted" style="margin:2px 0 0">${s.today ? L('Сегодня тренировка сделана ✅', 'Workout done today ✅') : s.current ? L('Сделай тренировку сегодня, чтобы не прервать серию', 'Do the workout today to keep your streak') : L('Начни серию сегодня', 'Start a streak today')}
          ${s.freezes ? ` · ❄️×${s.freezes} ${L('заморозка', 'freeze')}` : ''} · ${L('рекорд', 'best')} ${s.best}</div></div>
      </div>
      <div class="panel">
        <h2>${L('🎯 Тренировка дня', '🎯 Daily workout')} · ${d.count}/${d.games.length}</h2>
        <p class="tip" style="margin:-4px 0 6px">${L('По опорам: ум → знания → тело, ≈6 минут. Подобрано под твои слабые места.', 'By pillar: mind → knowledge → body, ≈6 minutes. Picked for your weak spots.')}</p>
        ${d.games.map((it) => {
          const g = game(it.id);
          if (!g) return '';
          const pl = pillarOf(g);
          return `<div class="gl" data-play="${g.id}"><div class="e">${g.emoji}</div><div class="t"><b>${esc(g.title)}</b>
            <small>${pl ? pl.emoji + ' ' + esc(pl.title) + ' · ' : ''}${(g.skills || []).map((x) => skill(x) ? skill(x).title : x).join(' · ')}</small></div>
            <div class="ok">${it.done ? '✅' : '▶️'}</div></div>`;
        }).join('')}
        ${next ? `<button class="btn" style="width:100%;margin-top:10px" data-play="${next.id}">▶ ${d.count ? L('Продолжить', 'Continue') : L('Начать тренировку', 'Start the workout')}</button>`
          : `<div class="badge" style="display:block;text-align:center;margin-top:10px">${L('🎉 Готово на сегодня! Возвращайся завтра', '🎉 Done for today! Come back tomorrow')}</div>`}
      </div>
      ${pathCard()}
      ${weakest()}
      <div class="panel"><div class="tip">💡 ${tip}</div></div>
      ${season ? `<div class="panel"><div class="tip">${season}</div></div>` : ''}`;
  }

  // ---------- общая идея: опоры и пути ----------
  const pillarOf = (g) => { const sec = cat.sections.find((x) => x.id === g.section); return sec && (cat.pillars || []).find((p) => p.id === sec.pillar); };
  /** Опоры дня: что из главного (ум, знания, код, тело) уже сделано сегодня */
  function pillarsToday() {
    const played = new Set(prof.today_games || []);
    const done = (pid) => cat.games.some((g) => played.has(g.id) && (pillarOf(g) || {}).id === pid);
    return `<div class="pillars">${(cat.pillars || []).filter((p) => ['mind', 'knowledge', 'code', 'body'].includes(p.id))
      .map((p) => `<span class="pl ${done(p.id) ? 'on' : ''}" title="${esc(p.desc)}">${p.emoji} ${esc(p.title)} ${done(p.id) ? '✓' : ''}</span>`).join('')}</div>`;
  }
  const PATH_KEY = 'arcade:path';
  function activePath() {
    const list = prof.paths || [];
    let id = null;
    try { id = localStorage.getItem(PATH_KEY); } catch (e) { /* noop */ }
    return list.find((p) => p.id === id) || list.find((p) => p.done < p.total) || list[0];
  }
  function stepRow(st, i, cur) {
    const g = game(st.game);
    if (!g) return '';
    const goal = st.lv ? L(`уровень ${st.lv}`, `level ${st.lv}`) : L('сыграть', 'play once');
    return `<div class="gl step ${st.done ? 'done' : ''} ${cur ? 'cur' : ''}" data-play="${g.id}"><div class="e">${g.emoji}</div><div class="t"><b>${i + 1}. ${esc(g.title)}</b>
      <small>${(pillarOf(g) || {}).emoji || ''} ${esc(goal)}</small></div><div class="ok">${st.done ? '✅' : cur ? '▶️' : '·'}</div></div>`;
  }
  /** «Твой путь» на главной: прогресс и следующий шаг */
  function pathCard() {
    const p = activePath();
    if (!p) return '';
    const i = p.next ? p.steps.indexOf(p.steps.find((x) => x.game === p.next.game && x.lv === p.next.lv)) : -1;
    return `<div class="panel"><h2>${L('🧭 Твой путь', '🧭 Your path')}: ${p.emoji} ${esc(p.title)} · ${p.done}/${p.total}</h2>
      <p class="tip" style="margin:-4px 0 6px">${esc(p.desc)}</p>${bar(p.done, p.total)}
      ${i >= 0 ? stepRow(p.steps[i], i, true) : `<div class="badge" style="display:block;text-align:center">${L('🏁 Путь пройден! Выбери следующий', '🏁 Path complete! Pick the next one')}</div>`}
      <button class="btn ghost" style="width:100%;margin-top:8px" data-act="paths">${L('🗺 Все пути', '🗺 All paths')}</button></div>`;
  }
  /** Все пути — в профиле */
  function pathsPanel() {
    const cur = activePath();
    return `<div class="panel" id="paths"><h2>${L('🗺 Пути', '🗺 Paths')}</h2>
      <p class="tip" style="margin:-4px 0 6px">${L('Путь — маршрут через разные разделы к одной цели. Игры связаны: каждая следующая опирается на прошлые.', 'A path is a route through different sections towards one goal. Games are linked: each one builds on the previous ones.')}</p>
      ${(prof.paths || []).map((p) => `<details class="path" ${p.id === (cur || {}).id ? 'open' : ''}><summary><span>${p.emoji}</span><b>${esc(p.title)}</b><small>${p.done}/${p.total}</small>
        ${p.id === (cur || {}).id ? `<em>${L('выбран', 'active')}</em>` : `<button class="btn ghost" data-path="${p.id}">${L('Выбрать', 'Choose')}</button>`}</summary>
        <p class="tip">${esc(p.desc)}</p>${p.steps.map((st, i) => stepRow(st, i, p.next === st || (p.next && st.game === p.next.game && st.lv === p.next.lv))).join('')}</details>`).join('')}
    </div>`;
  }

  function weakest() {
    const cog = prof.skills.filter((s) => ['speed', 'attention', 'memory', 'flex', 'logic', 'spatial', 'math', 'language'].includes(s.id));
    const w = cog.slice().sort((a, b) => a.xp - b.xp)[0];
    if (!w) return '';
    const picks = cat.games.filter((g) => g.section !== 'arcade' && (g.skills || []).includes(w.id)).slice(0, 4);
    return `<div class="panel"><h2>${L('📉 Подтяни', '📉 Work on')}: ${esc(w.title)}</h2><p class="tip" style="margin:-4px 0 6px">${esc(w.desc)}. ${L('Этот навык у тебя прокачан меньше всего.', 'This is your least-trained skill.')}</p>
      ${picks.map((g) => `<div class="gl" data-play="${g.id}"><div class="e">${g.emoji}</div><div class="t"><b>${esc(g.title)}</b><small>${esc(g.desc)}</small></div><div class="ok">▶️</div></div>`).join('')}</div>`;
  }

  function guest() {
    return `<div class="panel center"><div class="emoji brainpoke" style="font-size:52px">🧠</div><h2>${L('Аркада для мозга', 'Brain Arcade')}</h2>
      <p class="tip">${L('Открой Mini App из Telegram (бот → /profile), чтобы копить опыт, проходить уровни, получать ачивки и тренировку дня.', 'Open the Mini App from Telegram (bot → /profile) to earn XP, clear levels, unlock achievements and get a daily workout.')}</p>
      <button class="btn" data-tab="games">${L('🎮 Смотреть игры', '🎮 Browse games')}</button></div>`;
  }

  let query = '';
  function gameRow(g) {
    const p = prof && prof.games[g.id];
    const stars = p ? p.stars : 0, passed = p ? p.passed : 0;
    const right = g.app ? `<span class="tag">${L('открыть', 'open')}</span>`
      : !prof ? '' : passed ? `<span class="tag on">${L('ур.', 'lv.')} ${passed}${stars ? ' · ★' + stars : ''}</span>` : p && p.plays ? `<span class="tag">${L('играл', 'played')}</span>` : `<span class="tag new">${L('новое', 'new')}</span>`;
    return `<button class="grow" data-play="${g.id}"><span class="e">${g.emoji}</span>
      <span class="t"><b>${esc(g.title)}</b><small>${esc(g.desc)}</small></span>${right}</button>`;
  }
  // Поле поиска рисуется один раз; при вводе обновляется только список под ним (gamesBody),
  // иначе на телефоне сбивается набор: клавиатура теряет поле посреди слова, ломаются подсказки и автозамена.
  function games() {
    return `<input class="search" type="search" placeholder="${L('🔎 Поиск: игра, тема, предмет…', '🔎 Search: game, topic, subject…')}" value="${esc(query)}" data-search>
      <div id="gbody">${gamesBody()}</div>`;
  }
  function gamesBody() {
    const secs = cat.sections.map((s) => ({ id: s.id, title: s.title, n: cat.games.filter((g) => g.section === s.id).length }));
    if (sectionFilter === 'all') sectionFilter = secs[0].id;
    let html = '';
    const q = query.trim().toLowerCase();
    if (q) { // поиск по всему каталогу
      const found = cat.games.filter((g) => (g.title + ' ' + g.desc).toLowerCase().includes(q));
      return `<div class="panel list">${found.length ? found.map(gameRow).join('') : `<p class="tip">${L('Ничего не нашлось', 'Nothing found')}</p>`}</div>`;
    }
    const recent = prof ? Object.entries(prof.games).filter(([, v]) => v.last).sort((a, b) => b[1].last - a[1].last).slice(0, 8).map(([id]) => game(id)).filter(Boolean) : [];
    if (recent.length) html += `<h3 class="gh">${L('🕘 Недавние', '🕘 Recent')}</h3><div class="recent">${recent.map((g) => `<button data-play="${g.id}"><span>${g.emoji}</span><small>${esc(g.title)}</small></button>`).join('')}</div>`;
    html += `<div class="seg secs">${secs.map((s) => `<button class="${s.id === sectionFilter ? 'on' : ''}" data-sec="${s.id}">${esc(s.title)} <small>${s.n}</small></button>`).join('')}</div>`;
    const sec = cat.sections.find((s) => s.id === sectionFilter);
    html += `<p class="tip" style="margin:6px 2px 10px">${esc(sec.desc)}</p>`;
    const groups = sec.groups && sec.groups.length ? sec.groups : [{ id: '', title: '' }];
    for (const gr of groups) {
      const list = cat.games.filter((g) => g.section === sec.id && (!gr.id || g.group === gr.id));
      if (!list.length) continue;
      html += `${gr.title ? `<h3 class="gh">${esc(gr.title)}</h3>` : ''}<div class="panel list">${list.map(gameRow).join('')}</div>`;
    }
    return html;
  }

  // ---------- ник и аватар ----------
  const AV_COLORS = ['#e5534b', '#f0883e', '#e3b341', '#3fb950', '#39c5cf', '#4a90e2', '#a371f7', '#db61a2'];
  const myName = () => (prof && (prof.nickname || prof.name)) || '?';
  function avatarHtml(big) {
    const a = prof && prof.avatar;
    const bg = a ? AV_COLORS[(prof.avatars || []).indexOf(a) % AV_COLORS.length] : 'var(--accent)';
    return `<div class="avatar${big ? ' big' : ''}" style="background:${bg}">${a ? a : esc(myName()[0])}</div>`;
  }
  let editing = false, draftAvatar = null;
  function editor() {
    const cur = draftAvatar !== null ? draftAvatar : prof.avatar || '';
    return `<div class="panel"><h2>${L('✏️ Ник и аватарка', '✏️ Nickname and avatar')}</h2>
      <p class="tip">${L('Видны в таблицах рекордов, турнирах и сообщениях бота. Пустой ник — имя из Telegram', "Shown in leaderboards, tournaments and bot messages. Empty nickname — your Telegram name")} (${esc(prof.name)}).</p>
      <input class="search" maxlength="20" placeholder="${L('Ник, 2–20 символов', 'Nickname, 2–20 characters')}" value="${esc(prof.nickname || '')}" data-nick>
      <div class="avgrid">${['', ...prof.avatars].map((a) => `<button class="${a === cur ? 'on' : ''}" data-av="${a}">${a || '🚫'}</button>`).join('')}</div>
      <p class="tip" data-err></p>
      <div class="row"><button class="btn ghost" data-act="cancel">${L('Отмена', 'Cancel')}</button><button class="btn" data-act="saveme">${L('Сохранить', 'Save')}</button></div></div>`;
  }

  function profile() {
    if (!prof) return guest();
    if (editing) return editor();
    const st = prof.stats;
    const lvSpan = prof.xp_next - prof.xp_start, lvHave = prof.xp - prof.xp_start;
    const got = prof.achievements.filter((a) => a.unlocked).length;
    return `
      <div class="panel"><div class="hello" style="margin:0">${avatarHtml()}
        <div class="who"><b>${esc(myName())} <button class="editme" data-act="edit">✏️</button></b><span class="chip">${L('Уровень', 'Level')} ${prof.level} · ${esc(prof.title)}</span>
        ${bar(lvHave, lvSpan)}<small class="muted" style="margin:0">${L(`${prof.xp} XP всего · ещё ${lvSpan - lvHave} до уровня ${prof.level + 1}`, `${prof.xp} XP total · ${lvSpan - lvHave} more to level ${prof.level + 1}`)}</small></div></div></div>
      <div class="panel stats">
        <div><b>${st.plays}</b><small>${L('партий', 'rounds')}</small></div><div><b>${st.days}</b><small>${L('дней', 'days')}</small></div>
        <div><b>${st.games}</b><small>${L('игр', 'games')}</small></div><div><b>${st.stars}</b><small>${L('звёзд', 'stars')}</small></div>
      </div>
      ${window.KnowledgeGraph ? window.KnowledgeGraph.html(prof) : ''}
      ${pathsPanel()}
      <div class="panel"><button class="btn ghost" style="width:100%" data-tab="settings">${L('⚙️ Настройки и напоминание', '⚙️ Settings and reminder')}</button></div>
      <div class="panel"><h2>${L('🧩 Навыки', '🧩 Skills')}</h2>
        ${prof.skills.map((s) => `<div class="skill"><div class="h"><span>${esc(s.title)}</span><b>${L('ур.', 'lv.')} ${s.level}</b></div>
          ${bar(s.xp - s.start, s.next - s.start)}<small>${esc(s.desc)}</small></div>`).join('')}
      </div>
      <div class="panel"><h2>${L('🏅 Ачивки', '🏅 Achievements')} · ${got}/${prof.achievements.length}${prof.eggs ? ` · 🥚 ${prof.eggs.found}/${prof.eggs.total}` : ''}</h2>
        <div class="achs">${prof.achievements.map((a) => `<div class="ach ${a.unlocked ? '' : 'lock'}${a.secret ? ' secret' : ''}"><div class="ae">${a.emoji}</div><b>${esc(a.title)}</b>
          <small>${esc(a.desc)}</small>${a.unlocked || a.secret ? '' : `<small>${a.progress}/${a.goal}</small>`}</div>`).join('')}</div>
      </div>`;
  }

  const link = (url, text) => `<a href="${url}" data-link="${url}">${text}</a>`;

  // «Наука»: исследования + как мы проверяем контент + открытые источники + благодарности
  function science() {
    return research() + method() + sources() + thanks();
  }

  function method() {
    return `<div class="panel sci"><h2>${L('🧪 Как мы проверяем материалы', '🧪 How we check the content')}</h2><ul>
      <li>${L('Каждый генератор заданий прогоняется тысячи раз: нет пустых, битых и неоднозначных вопросов, у каждого вопроса ровно один верный ответ.', 'Every task generator runs thousands of times: no empty, broken or ambiguous questions, exactly one correct answer each.')}</li>
      <li>${L('Весь учебный код (алгоритмы, «Собери код», «Найди ошибку», «Что выведет код?») исполняется в настоящем Python и JavaScript с тестами.', 'All teaching code (algorithms, Build the Code, Find the Bug, What Does It Print?) runs in real Python and JavaScript with tests.')}</li>
      <li>${L('Все 1500 шахматных задач проигрываются по правилам до конца решения.', 'All 1500 chess puzzles are replayed by the rules to the end of the solution.')}</li>
      <li>${L('Игры проверяются на двух языках: в английской версии не остаётся русского текста.', 'Games are checked in both languages: no Russian text is left in the English version.')}</li>
      <li>${L('Данные из открытых баз чистятся: убираем неоднозначные и ошибочные записи (например, картину, «написанную» после смерти автора).', 'Open data is cleaned: we drop ambiguous and wrong records (for example, a painting “made” after the artist died).')}</li>
    </ul></div>`;
  }

  const SOURCES = [
    ['♟', 'Lichess puzzle database', 'https://database.lichess.org/', 'CC0', L('1500 шахматных задач с рейтингом', '1500 rated chess puzzles')],
    ['♞', 'chess.js', 'https://github.com/jhlywa/chess.js', 'BSD-2-Clause', L('правила шахмат: проверка ходов', 'chess rules: move validation')],
    ['♛', L('Фигуры Cburnett', 'Cburnett chess pieces'), 'https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces', 'GPL / BSD / GFDL', L('понятные фигуры на доске', 'clear pieces on the board')],
    ['🗣', 'Tatoeba · ManyThings.org', 'https://tatoeba.org', 'CC BY 2.0 FR', L('800 живых фраз en↔ru', '800 everyday en↔ru phrases')],
    ['❓', 'Open Trivia Database', 'https://opentdb.com', 'CC BY-SA 4.0', L('600 вопросов викторины', '600 trivia questions')],
    ['💪', 'free-exercise-db', 'https://github.com/yuhonas/free-exercise-db', 'Unlicense', L('42 упражнения с фото и описанием техники для раздела «Тело»', '42 exercises with photos and technique notes for the Body section')],
    ['🌍', 'mledoze/countries', 'https://github.com/mledoze/countries', 'ODbL 1.0', L('границы и площади стран, английские названия', 'borders, areas and English names of countries')],
    ['🏳️', 'Twemoji (jdecked)', 'https://github.com/jdecked/twemoji', 'CC BY 4.0', L('флаги, которые видны на любом устройстве', 'flags that show on any device')],
    ['🖼', 'Wikidata', 'https://www.wikidata.org', 'CC0', L('картины и художники, постройки и архитекторы', 'paintings and artists, buildings and architects')],
    ['📏', L('ФИПИ (ориентир)', 'FIPI (reference)'), 'https://fipi.ru', L('факты языка', 'language facts'), L('орфоэпический словник и паронимы ЕГЭ — только как ориентир по темам', 'Russian exam word lists — used only as a topic reference')],
    ['🐍', 'Python · aiogram · FastAPI · uvicorn · aiosqlite', 'https://github.com/aiogram/aiogram', L('открытые лицензии', 'open licences'), L('бот и сервер', 'the bot and the server')],
    ['✈️', 'Telegram Mini Apps', 'https://core.telegram.org/bots/webapps', '—', L('игры прямо внутри Telegram', 'games right inside Telegram')],
  ];
  function sources() {
    return `<div class="panel sci"><h2>${L('📂 Открытые источники', '📂 Open sources')}</h2>
      <p>${L('Аркада собрана на открытых данных и открытом коде. Каждый набор хранит свою лицензию; полный список — в', 'The Arcade is built on open data and open code. Every dataset keeps its own licence; the full list is in')} ${link('https://github.com/Lionl1/tg-arcade/blob/main/docs/credits.md', 'docs/credits.md')}.</p>
      <div class="src-list">${SOURCES.map(([e, name, url, lic, what]) => `<div class="src"><span>${e}</span><div><b>${link(url, esc(name))}</b><small>${esc(what)}</small></div><em>${esc(lic)}</em></div>`).join('')}</div>
      <p class="tip">${L('Сам проект — открытый (MIT):', 'The project itself is open source (MIT):')} ${link('https://github.com/Lionl1/tg-arcade', 'github.com/Lionl1/tg-arcade')}. ${L('Исправления и новые игры приветствуются.', 'Fixes and new games are welcome.')}</p></div>`;
  }

  function thanks() {
    const T = L([
      'сообществу <b>Lichess</b> — за свободную шахматную платформу и открытую базу задач;',
      'тысячам редакторов <b>Wikidata и Википедии</b> — за знания, доступные всем;',
      'волонтёрам <b>Tatoeba</b> и Чарльзу Келли (<b>ManyThings.org</b>) — за живые фразы с переводами;',
      'авторам вопросов <b>Open Trivia Database</b>;',
      'Мохаммеду Ле Дозу (<b>mledoze/countries</b>) и всем, кто поддерживает данные о странах;',
      'Джеффу Хлайве (<b>chess.js</b>) и Колину Бёрнетту (<b>шахматные фигуры</b>);',
      'команде <b>Twemoji</b> — за открытые эмодзи;',
      'автору <b>free-exercise-db</b> — за открытую базу упражнений с фотографиями;',
      'авторам <b>aiogram, FastAPI, uvicorn</b> и всему open source-сообществу Python;',
      'учёным, чьи исследования легли в основу тренировок и интервальных повторений;',
      'всем игрокам и тестировщикам — за ошибки, идеи и «а можно ещё…».',
    ], [
      'the <b>Lichess</b> community — for a free chess platform and an open puzzle database;',
      'thousands of <b>Wikidata and Wikipedia</b> editors — for knowledge open to everyone;',
      '<b>Tatoeba</b> volunteers and Charles Kelly (<b>ManyThings.org</b>) — for everyday phrases with translations;',
      'the authors of <b>Open Trivia Database</b> questions;',
      'Mohammed Le Doze (<b>mledoze/countries</b>) and everyone who maintains country data;',
      'Jeff Hlywa (<b>chess.js</b>) and Colin M.L. Burnett (<b>chess pieces</b>);',
      'the <b>Twemoji</b> team — for open emoji;',
      'the author of <b>free-exercise-db</b> — for an open exercise database with photos;',
      'the authors of <b>aiogram, FastAPI, uvicorn</b> and the whole Python open-source community;',
      'the researchers whose work shaped the training and spaced repetition;',
      'every player and tester — for bug reports, ideas and “could you also add…”.',
    ]);
    return `<div class="panel sci"><h2>${L('🙏 Благодарности', '🙏 Thanks')}</h2>
      <p>${L('Спасибо всем, без кого этой аркады бы не было:', 'Thank you to everyone who made this arcade possible:')}</p>
      <ul>${T.map((t) => `<li>${t}</li>`).join('')}</ul>
      <p class="tip">${L('Нашёл ошибку в вопросе или хочешь предложить игру — пиши на GitHub. 🧠', 'Found a mistake in a question or want to suggest a game? Write on GitHub. 🧠')}</p></div>`;
  }

  function research() {
    if (LANG === 'en') return `<div class="panel sci"><h2>🔬 What the research says</h2>
      <p>We built the Arcade on research findings — and we are honest about their limits.</p>
      <ul>
        <li><b>You get better at what you train.</b> A review of all “brain training” studies found that scores in the games themselves improve, while transfer to everyday life is weakly supported. So we train <b>many different skills</b> rather than one game. ${link('https://news.illinois.edu/review-finds-little-evidence-that-brain-training-games-yield-real-world-benefits/', 'Simons et al., 2016')}</li>
        <li><b>Processing speed</b> training was the only one with a long-lasting effect in the large ACTIVE study, and the effect grew with the number of sessions. The daily workout always includes a speed or attention game. ${link('https://pmc.ncbi.nlm.nih.gov/articles/PMC5700828', 'Edwards et al., 2017')}</li>
        <li><b>A combined approach</b> — diet, exercise, mental training and vascular health together — improved cognitive test scores in older adults. Games are only one part. ${link('https://news.ki.se/brain-training-and-healthy-lifestyle-may-slow-down-cognitive-decline', 'FINGER, 2015')}</li>
        <li><b>Learning a new, demanding skill</b> improves memory more than simply pleasant activities. Hence the Study section and the levels. ${link('https://pubmed.ncbi.nlm.nih.gov/24214244/', 'Park et al., 2014')}</li>
        <li><b>Retrieval practice with spaced repetition</b> is one of the most reliable ways to learn. That is exactly how the flashcards work. ${link('https://link.springer.com/10.1007/s10648-020-09572-8', 'meta-analysis, 2020')}</li>
        <li><b>Action games</b> train attention and spatial thinking. ${link('https://archive-ouverte.unige.ch/unige:101941', 'Bediou et al., 2018')}</li>
        <li><b>Movement trains the brain too.</b> The WHO recommends 150–300 minutes of moderate activity a week plus strength training 2+ times a week for adults, and breaking up long sitting. Hence the Body section and the break reminder. ${link('https://www.who.int/publications/i/item/9789240015128', 'WHO, 2020')}</li>
        <li><b>Short intense intervals</b> (morning sets, Tabata) give a noticeable effect in just minutes. ${link('https://pubmed.ncbi.nlm.nih.gov/8897392/', 'Tabata et al., 1996')}</li>
      </ul>
      <p><b>What we do not promise:</b> higher IQ, protection from dementia or treatment of anything. Games are a fun and useful warm-up, not a medicine.</p></div>`;
    return `<div class="panel sci"><h2>🔬 Что говорят исследования</h2>
      <p>Мы собрали «Аркаду» по выводам исследований — и честно говорим, где их границы.</p>
      <ul>
        <li><b>Тренируется то, что тренируешь.</b> Обзор всех исследований «brain training» показал: результат в самих играх растёт, а перенос на жизнь доказан слабо. Поэтому мы качаем <b>много разных навыков</b>, а не одну игру. ${link('https://news.illinois.edu/review-finds-little-evidence-that-brain-training-games-yield-real-world-benefits/', 'Simons et al., 2016')}</li>
        <li><b>Скорость обработки информации</b> — единственная тренировка с долгим эффектом в большом исследовании ACTIVE: эффект рос с числом занятий. В тренировке дня всегда есть игра на скорость или внимание. ${link('https://pmc.ncbi.nlm.nih.gov/articles/PMC5700828', 'Edwards et al., 2017')}</li>
        <li><b>Комплексный подход</b> — питание, движение, тренировки ума и здоровье сосудов вместе — улучшил когнитивные тесты пожилых людей. Игры — лишь часть. ${link('https://news.ki.se/brain-training-and-healthy-lifestyle-may-slow-down-cognitive-decline', 'FINGER, 2015')}</li>
        <li><b>Освоение нового сложного навыка</b> улучшает память сильнее, чем просто приятное времяпрепровождение. Отсюда раздел «Учёба» и уровни. ${link('https://pubmed.ncbi.nlm.nih.gov/24214244/', 'Park et al., 2014')}</li>
        <li><b>Вспоминать и повторять с интервалами</b> — один из самых надёжных способов учиться. Карточки работают именно так. ${link('https://link.springer.com/10.1007/s10648-020-09572-8', 'метаанализ, 2020')}</li>
        <li><b>Динамичные игры</b> тренируют внимание и пространственное мышление. ${link('https://archive-ouverte.unige.ch/unige:101941', 'Bediou et al., 2018')}</li>
        <li><b>Движение — тоже тренировка мозга.</b> ВОЗ советует взрослым 150–300 минут умеренной активности в неделю и силовые упражнения 2+ раза в неделю, а долгое сидение — прерывать. Отсюда раздел «Тело» и напоминание размяться. ${link('https://www.who.int/publications/i/item/9789240015128', 'ВОЗ, 2020')}</li>
        <li><b>Короткие интенсивные интервалы</b> (зарядка, табата) дают заметный эффект за считанные минуты. ${link('https://pubmed.ncbi.nlm.nih.gov/8897392/', 'Tabata et al., 1996')}</li>
      </ul>
      <p><b>Чего мы не обещаем:</b> рост IQ, защиту от деменции или лечение чего-либо. Игры — это весёлая и полезная разминка, а не лекарство.</p></div>`;
  }

  function settings() {
    if (!prof) return guest() + `<div class="panel"><p class="tip">${L('Без входа через Telegram настройки сохраняются только на этом устройстве.', 'Without Telegram sign-in, settings are saved on this device only.')}</p></div>`;
    const r = prof.reminder, P = prof.prefs;
    const groups = {};
    for (const o of prof.prefs_schema) (groups[o.group] = groups[o.group] || []).push(o);
    const row = (o) => {
      const v = P[o.key];
      const ctl = typeof o.default === 'boolean' && !o.labels
        ? `<button class="toggle ${v ? 'on' : ''}" data-set="${o.key}" data-val='${JSON.stringify(!v)}'></button>`
        : '';
      const seg = ctl ? '' : `<div class="seg">${o.choices.map((c, i) => `<button class="${c === v ? 'on' : ''}" data-set="${o.key}" data-val='${JSON.stringify(c)}'>${esc(o.labels ? o.labels[i] : String(c))}</button>`).join('')}</div>`;
      return `<div class="setrow"><div class="top"><span>${esc(o.title)}</span>${ctl}</div>${seg}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</div>`;
    };
    return `
      <div class="panel"><h2>${L('⏰ Напоминание', '⏰ Reminder')}</h2>
        <div class="switch"><span>${L('Напоминать о тренировке дня', 'Remind me about the daily workout')}</span><button class="toggle ${r.on ? 'on' : ''}" data-act="toggle"></button></div>
        <div class="switch"><span>${L('Время', 'Time')}</span><input type="time" value="${esc(r.time)}" data-act="time"></div>
        <p class="tip" data-rem>${r.on && !r.can_write ? L('⚠️ Бот не смог написать тебе. Открой чат с ботом и нажми «Старт», затем включи заново.', "⚠️ The bot couldn't message you. Open the bot chat, tap “Start”, then turn this on again.") : L('Пришлю одно сообщение в личку, только если тренировка ещё не сделана.', "I'll send one private message, only if the workout isn't done yet.")}</p>
      </div>
      ${Object.entries(groups).map(([g, list]) => `<div class="panel"><h2>${esc(g)}</h2>${list.map(row).join('')}</div>`).join('')}
      <div class="panel"><p class="tip">${L('Настройки группы (турниры, дуэли, объявления о рекордах, язык) — команда /settings в самой группе, для админов.', 'Group settings (tournaments, duels, record announcements, language) — the /settings command in the group itself, for admins.')}</p>
        <button class="btn ghost" style="width:100%" data-act="reset">${L('↺ Сбросить мои настройки', '↺ Reset my settings')}</button></div>`;
  }

  async function setPref(key, value) {
    prof.prefs[key] = value;
    window.ArcadePrefs.save({ [key]: value }); // применяем сразу (тема, текст, анимации)
    render(true);
    try { prof.prefs = (await api('settings', { changes: { [key]: value } })).prefs; } catch (e) { /* локально уже сохранено */ }
    if (key === 'lang') location.reload(); // язык определяется при загрузке страницы
  }

  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  // ---------- рендер и события ----------
  function render() {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const keep = view.scrollTop;
    view.innerHTML = { today, games, profile, science, settings }[tab]();
    view.scrollTop = arguments[0] ? keep : 0;
    if (tab === 'profile' && prof && window.KnowledgeGraph) {
      window.KnowledgeGraph.bind(view, prof, cat.games);
      if (location.hash === '#graph' && !arguments[0]) { const g = view.querySelector('#graph'); if (g) g.scrollIntoView(); }
    }
  }
  view.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-path],[data-play],[data-sec],[data-tab],[data-act],[data-link],[data-set],[data-av]');
    if (!t) return;
    if (t.dataset.link) { e.preventDefault(); if (tg && tg.openLink) tg.openLink(t.dataset.link); else window.open(t.dataset.link, '_blank'); return; }
    if (t.dataset.play) { haptic(); location.href = playUrl(t.dataset.play); return; }
    if (t.dataset.sec) { sectionFilter = t.dataset.sec; haptic('select'); render(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); return; }
    if (t.dataset.set) { haptic('select'); await setPref(t.dataset.set, JSON.parse(t.dataset.val)); return; }
    if (t.dataset.act === 'reset') {
      const def = window.ArcadePrefs.DEF;
      window.ArcadePrefs.save(def); prof.prefs = { ...prof.prefs, ...def }; render(true);
      try { prof.prefs = (await api('settings', { changes: def })).prefs; } catch (err) { /* noop */ }
      return;
    }
    if (t.dataset.path) { e.preventDefault(); try { localStorage.setItem(PATH_KEY, t.dataset.path); } catch (err) { /* noop */ } haptic('select'); render(true); return; }
    if (t.dataset.act === 'paths') { tab = 'profile'; render(); const el = view.querySelector('#paths'); if (el) el.scrollIntoView(); return; }
    if (t.dataset.act === 'edit') { editing = true; draftAvatar = null; render(); return; }
    if (t.dataset.act === 'cancel') { editing = false; render(); return; }
    if (t.dataset.av !== undefined) { draftAvatar = t.dataset.av; view.querySelectorAll('[data-av]').forEach((b) => b.classList.toggle('on', b === t)); haptic('select'); return; }
    if (t.dataset.act === 'saveme') {
      const nickname = view.querySelector('[data-nick]').value;
      try {
        const r = await api('me', { nickname, avatar: draftAvatar !== null ? draftAvatar : prof.avatar || '' });
        prof.nickname = r.nickname; prof.avatar = r.avatar; editing = false; haptic(); render();
      } catch (err) { view.querySelector('[data-err]').textContent = '⚠️ ' + err.message; }
      return;
    }
    if (t.dataset.act === 'toggle') await setReminder(!prof.reminder.on);
  });
  view.addEventListener('input', (e) => {
    if (!e.target.matches('[data-search]')) return;
    query = e.target.value;
    const body = view.querySelector('#gbody');
    if (body) body.innerHTML = gamesBody(); // само поле не трогаем
  });
  view.addEventListener('change', (e) => {
    if (e.target.dataset.act === 'time') setReminder(prof.reminder.on, e.target.value);
  });
  document.getElementById('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    tab = b.dataset.tab; haptic('select'); render();
  });

  async function setReminder(on, time) {
    time = time || prof.reminder.time;
    if (on && tg && tg.requestWriteAccess && inTg) {
      // разрешение боту писать в личку (если игрок ещё не нажимал «Старт»)
      const allowed = await new Promise((res) => { try { tg.requestWriteAccess((ok) => res(ok)); } catch (e) { res(true); } });
      if (!allowed) { const p = view.querySelector('[data-rem]'); if (p) p.textContent = L('Без разрешения бот не сможет присылать напоминания.', "Without permission the bot can't send reminders."); return; }
    }
    try {
      await api('reminder', { on, time });
      prof.reminder = { on, time, can_write: true };
      haptic(); render();
    } catch (err) { const p = view.querySelector('[data-rem]'); if (p) p.textContent = err.message; }
  }

  // ---------- пасхалки ----------
  const motionOk = () => !window.ArcadePrefs || window.ArcadePrefs.get('motion') !== false;
  function burst(emojis, n = 28) { // конфетти из эмодзи
    if (!motionOk()) return;
    for (let i = 0; i < n; i++) {
      const e = document.createElement('div');
      e.className = 'egg-fx';
      e.textContent = emojis[i % emojis.length];
      e.style.left = Math.random() * 100 + 'vw';
      e.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
      e.style.animationDelay = Math.random() * 0.6 + 's';
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 4200);
    }
  }
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  async function foundEgg(code, fx) {
    burst(fx);
    haptic();
    if (!authed) return toast(L('🥚 Пасхалка! Открой из Telegram, чтобы она засчиталась', '🥚 Easter egg! Open from Telegram for it to count'));
    try {
      const r = await api('egg', { code });
      if (r.achievement) {
        toast(`🥚 ${L('Пасхалка найдена', 'Easter egg found')}: ${r.achievement.emoji} ${r.achievement.title} · +25 XP`);
        prof = await api('profile'); render(true);
      } else toast(L('🥚 Эту пасхалку ты уже нашёл', '🥚 You already found this one'));
    } catch (e) { /* не страшно */ }
  }
  // код Конами: стрелки и B A на клавиатуре; на телефоне — свайпы и тапы слева (B) / справа (A)
  const KONAMI = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
  let seq = [];
  const push = (k) => { seq = seq.concat(k).slice(-KONAMI.length); if (seq.join() === KONAMI.join()) { seq = []; foundEgg('konami', ['🎮', '👾', '⭐', '🕹']); } };
  window.addEventListener('keydown', (e) => {
    const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyB: 'b', KeyA: 'a' }[e.code];
    if (k) push(k);
  });
  let t0 = null;
  window.addEventListener('touchstart', (e) => { const t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY }; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!t0) return;
    const t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 40) push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    else if (seq.length >= 8) push(t.clientX < innerWidth / 2 ? 'b' : 'a'); // B и A — только в конце кода, чтобы обычные тапы не мешали
    t0 = null;
  }, { passive: true });
  // «не трогай мозг»: 10 тапов по аватарке/мозгу за 4 секунды
  let pokes = [];
  view.addEventListener('click', (e) => {
    const a = e.target.closest('.avatar, .brainpoke');
    if (!a) return;
    const now = Date.now();
    pokes = pokes.filter((t) => now - t < 4000).concat(now);
    a.classList.remove('wobble'); void a.offsetWidth; a.classList.add('wobble');
    if (pokes.length === 5) toast(L('🧠 Эй, щекотно!', '🧠 Hey, that tickles!'));
    if (pokes.length >= 10) { pokes = []; foundEgg('brainpoke', ['🧠', '💥', '✨', '😵‍💫']); }
  });
  // сезонные сюрпризы
  function seasonal() {
    const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    if ((m === 12 && day >= 20) || (m === 1 && day <= 10)) { // Новый год: снег
      if (motionOk()) for (let i = 0; i < 18; i++) {
        const f = document.createElement('div');
        f.className = 'snow'; f.textContent = '❄';
        f.style.left = Math.random() * 100 + 'vw'; f.style.animationDuration = 6 + Math.random() * 8 + 's'; f.style.animationDelay = -Math.random() * 10 + 's';
        f.style.fontSize = 10 + Math.random() * 14 + 'px';
        document.body.appendChild(f);
      }
      return L('🎄 С наступающим! Лучший подарок мозгу — серия тренировок без пропусков.', '🎄 Happy holidays! The best gift for your brain is an unbroken workout streak.');
    }
    if (m === 10 && day === 31) { burst(['🎃', '🦇', '👻'], 16); return L('🎃 Страшно полезная тренировка сегодня!', '🎃 A scarily good workout today!'); }
    if (m === 4 && day === 1) { document.body.classList.add('april'); return L('🐟 С 1 апреля! Мозг сегодня вверх ногами — проверь, не перевернулось ли что-нибудь.', '🐟 April Fools! The brain is upside down today — check if anything flipped.'); }
    if (m === 3 && day === 14) return L('🥧 Сегодня день числа π. Сыграй в 3:14 — вдруг что-то случится…', '🥧 It’s Pi Day. Play at 3:14 — something might happen…');
    return '';
  }

  (async () => {
    document.querySelectorAll('#tabs button').forEach((b) => {
      const t = { today: L('Сегодня', 'Today'), games: L('Игры', 'Games'), profile: L('Профиль', 'Profile'), science: L('Наука', 'Science'), settings: L('Настройки', 'Settings') }[b.dataset.tab];
      b.lastChild.textContent = t;
    });
    document.title = L('Аркада', 'Arcade');
    view.innerHTML = `<p class="center muted">${L('Загружаю…', 'Loading…')}</p>`;
    try { cat = await (await fetch('games/catalog.json', { cache: 'no-cache' })).json(); } catch (e) { view.textContent = L('Нет связи с сервером', 'No connection to the server'); return; }
    // каталог на языке интерфейса: игры с контентом на другом языке скрываем
    cat.games = cat.games.filter((g) => !g.lang || g.lang === LANG).map(localize);
    cat.sections.forEach((s) => { localize(s); (s.groups || []).forEach(localize); });
    cat.skills.forEach(localize);
    (cat.pillars || []).forEach(localize);
    cat.sections = cat.sections.filter((s) => cat.games.some((g) => g.section === s.id));
    season = seasonal();
    if (authed) { try { prof = await api('profile'); window.ArcadePrefs.save(prof.prefs); } catch (e) { prof = null; } } // синхронизация настроек на это устройство
    const want = qs.get('tab');
    if (want) tab = want;
    render();
  })();
})();
