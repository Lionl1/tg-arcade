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
      body: JSON.stringify(Object.assign({ initData, tz: TZ }, body || {})),
    });
    if (!r.ok) { let m = 'Ошибка ' + r.status; try { m = (await r.json()).detail || m; } catch (e) { /* noop */ } throw new Error(m); }
    return r.json();
  }

  let cat = null, prof = null, tab = 'today', sectionFilter = 'all';
  const game = (id) => cat.games.find((g) => g.id === id);
  const skill = (id) => cat.skills.find((s) => s.id === id);
  const playUrl = (id) => `play.html?g=${id}&from=hub${devQ}`;
  const bar = (have, span) => `<div class="bar"><i style="width:${Math.min(100, (have / Math.max(1, span)) * 100)}%"></i></div>`;

  const TIPS = [
    'Разнообразие важнее повторения: навыки, которые ты качаешь реже, дают больше опыта.',
    'Короткие ежедневные занятия эффективнее редких длинных — поэтому тренировка дня всего ~5 минут.',
    'Сон, движение и общение — не менее важная часть «тренировки мозга», чем игры.',
    'Карточки в «Учёбе» возвращаются через 1, 3, 7, 14 и 30 дней: так запоминается надёжнее.',
    'Сложность растёт вместе с тобой: уровни 9–12 — это уже настоящий вызов.',
    'Новый навык, который даётся с трудом, — лучший стимул для памяти. Попробуй незнакомую игру.',
  ];

  // ---------- вкладки ----------
  function today() {
    if (!prof) return guest();
    const d = prof.daily, s = prof.streak;
    const next = d.games.find((g) => !g.done);
    const lvSpan = prof.xp_next - prof.xp_start, lvHave = prof.xp - prof.xp_start;
    const tip = TIPS[(new Date().getDate()) % TIPS.length];
    return `
      <div class="hello">${avatarHtml()}
        <div class="who"><b>Привет, ${esc(myName().split(' ')[0])}!</b><span class="chip">Ур. ${prof.level} · ${esc(prof.title)}</span>
        ${bar(lvHave, lvSpan)}<small class="muted" style="margin:0">${lvHave} / ${lvSpan} XP до уровня ${prof.level + 1}</small></div></div>
      <div class="panel"><div class="tip">🧠 Нейросети думают за нас всё больше. Чтобы мозг оставался в форме, ему нужна ежедневная нагрузка: 5 минут тренировки + вспоминание выученного.</div></div>
      <div class="panel streak">
        <div class="fire ${s.current ? '' : 'off'}">🔥</div>
        <div><b>${s.current}</b> ${plural(s.current, 'день', 'дня', 'дней')} подряд
          <div class="muted" style="margin:2px 0 0">${s.today ? 'Сегодня тренировка сделана ✅' : s.current ? 'Сделай тренировку сегодня, чтобы не прервать серию' : 'Начни серию сегодня'}
          ${s.freezes ? ` · ❄️×${s.freezes} заморозка` : ''} · рекорд ${s.best}</div></div>
      </div>
      <div class="panel">
        <h2>🎯 Тренировка дня · ${d.count}/${d.games.length}</h2>
        <p class="tip" style="margin:-4px 0 6px">3 игры на разные навыки, ≈5 минут. Подобраны под твои слабые места.</p>
        ${d.games.map((it) => {
          const g = game(it.id);
          if (!g) return '';
          return `<div class="gl" data-play="${g.id}"><div class="e">${g.emoji}</div><div class="t"><b>${esc(g.title)}</b>
            <small>${(g.skills || []).map((x) => skill(x) ? skill(x).title : x).join(' · ')}</small></div>
            <div class="ok">${it.done ? '✅' : '▶️'}</div></div>`;
        }).join('')}
        ${next ? `<button class="btn" style="width:100%;margin-top:10px" data-play="${next.id}">▶ ${d.count ? 'Продолжить' : 'Начать тренировку'}</button>`
          : '<div class="badge" style="display:block;text-align:center;margin-top:10px">🎉 Готово на сегодня! Возвращайся завтра</div>'}
      </div>
      ${weakest()}
      <div class="panel"><div class="tip">💡 ${tip}</div></div>`;
  }

  function weakest() {
    const cog = prof.skills.filter((s) => ['speed', 'attention', 'memory', 'flex', 'logic', 'spatial', 'math', 'language'].includes(s.id));
    const w = cog.slice().sort((a, b) => a.xp - b.xp)[0];
    if (!w) return '';
    const picks = cat.games.filter((g) => g.section !== 'arcade' && (g.skills || []).includes(w.id)).slice(0, 4);
    return `<div class="panel"><h2>📉 Подтяни: ${esc(w.title)}</h2><p class="tip" style="margin:-4px 0 6px">${esc(w.desc)}. Этот навык у тебя прокачан меньше всего.</p>
      ${picks.map((g) => `<div class="gl" data-play="${g.id}"><div class="e">${g.emoji}</div><div class="t"><b>${esc(g.title)}</b><small>${esc(g.desc)}</small></div><div class="ok">▶️</div></div>`).join('')}</div>`;
  }

  function guest() {
    return `<div class="panel center"><div class="emoji" style="font-size:52px">🧠</div><h2>Аркада для мозга</h2>
      <p class="tip">Открой Mini App из Telegram (бот → /profile), чтобы копить опыт, проходить уровни, получать ачивки и тренировку дня.</p>
      <button class="btn" data-tab="games">🎮 Смотреть игры</button></div>`;
  }

  let query = '';
  function gameRow(g) {
    const p = prof && prof.games[g.id];
    const stars = p ? p.stars : 0, passed = p ? p.passed : 0;
    const right = g.app ? '<span class="tag">открыть</span>'
      : !prof ? '' : passed ? `<span class="tag on">ур. ${passed}${stars ? ' · ★' + stars : ''}</span>` : p && p.plays ? '<span class="tag">играл</span>' : '<span class="tag new">новое</span>';
    return `<button class="grow" data-play="${g.id}"><span class="e">${g.emoji}</span>
      <span class="t"><b>${esc(g.title)}</b><small>${esc(g.desc)}</small></span>${right}</button>`;
  }
  // Поле поиска рисуется один раз; при вводе обновляется только список под ним (gamesBody),
  // иначе на телефоне сбивается набор: клавиатура теряет поле посреди слова, ломаются подсказки и автозамена.
  function games() {
    return `<input class="search" type="search" placeholder="🔎 Поиск: игра, тема, предмет…" value="${esc(query)}" data-search>
      <div id="gbody">${gamesBody()}</div>`;
  }
  function gamesBody() {
    const secs = cat.sections.map((s) => ({ id: s.id, title: s.title, n: cat.games.filter((g) => g.section === s.id).length }));
    if (sectionFilter === 'all') sectionFilter = secs[0].id;
    let html = '';
    const q = query.trim().toLowerCase();
    if (q) { // поиск по всему каталогу
      const found = cat.games.filter((g) => (g.title + ' ' + g.desc).toLowerCase().includes(q));
      return `<div class="panel list">${found.length ? found.map(gameRow).join('') : '<p class="tip">Ничего не нашлось</p>'}</div>`;
    }
    const recent = prof ? Object.entries(prof.games).filter(([, v]) => v.last).sort((a, b) => b[1].last - a[1].last).slice(0, 8).map(([id]) => game(id)).filter(Boolean) : [];
    if (recent.length) html += `<h3 class="gh">🕘 Недавние</h3><div class="recent">${recent.map((g) => `<button data-play="${g.id}"><span>${g.emoji}</span><small>${esc(g.title)}</small></button>`).join('')}</div>`;
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
    return `<div class="panel"><h2>✏️ Ник и аватарка</h2>
      <p class="tip">Видны в таблицах рекордов, турнирах и сообщениях бота. Пустой ник — имя из Telegram (${esc(prof.name)}).</p>
      <input class="search" maxlength="20" placeholder="Ник, 2–20 символов" value="${esc(prof.nickname || '')}" data-nick>
      <div class="avgrid">${['', ...prof.avatars].map((a) => `<button class="${a === cur ? 'on' : ''}" data-av="${a}">${a || '🚫'}</button>`).join('')}</div>
      <p class="tip" data-err></p>
      <div class="row"><button class="btn ghost" data-act="cancel">Отмена</button><button class="btn" data-act="saveme">Сохранить</button></div></div>`;
  }

  function profile() {
    if (!prof) return guest();
    if (editing) return editor();
    const st = prof.stats;
    const lvSpan = prof.xp_next - prof.xp_start, lvHave = prof.xp - prof.xp_start;
    const got = prof.achievements.filter((a) => a.unlocked).length;
    return `
      <div class="panel"><div class="hello" style="margin:0">${avatarHtml()}
        <div class="who"><b>${esc(myName())} <button class="editme" data-act="edit">✏️</button></b><span class="chip">Уровень ${prof.level} · ${esc(prof.title)}</span>
        ${bar(lvHave, lvSpan)}<small class="muted" style="margin:0">${prof.xp} XP всего · ещё ${lvSpan - lvHave} до уровня ${prof.level + 1}</small></div></div></div>
      <div class="panel stats">
        <div><b>${st.plays}</b><small>партий</small></div><div><b>${st.days}</b><small>дней</small></div>
        <div><b>${st.games}</b><small>игр</small></div><div><b>${st.stars}</b><small>звёзд</small></div>
      </div>
      <div class="panel"><button class="btn ghost" style="width:100%" data-tab="settings">⚙️ Настройки и напоминание</button></div>
      <div class="panel"><h2>🧩 Навыки</h2>
        ${prof.skills.map((s) => `<div class="skill"><div class="h"><span>${esc(s.title)}</span><b>ур. ${s.level}</b></div>
          ${bar(s.xp - s.start, s.next - s.start)}<small>${esc(s.desc)}</small></div>`).join('')}
      </div>
      <div class="panel"><h2>🏅 Ачивки · ${got}/${prof.achievements.length}</h2>
        <div class="achs">${prof.achievements.map((a) => `<div class="ach ${a.unlocked ? '' : 'lock'}"><div class="ae">${a.emoji}</div><b>${esc(a.title)}</b>
          <small>${esc(a.desc)}</small>${a.unlocked ? '' : `<small>${a.progress}/${a.goal}</small>`}</div>`).join('')}</div>
      </div>`;
  }

  function science() {
    const link = (url, text) => `<a href="${url}" data-link="${url}">${text}</a>`;
    return `<div class="panel sci"><h2>🔬 Что говорят исследования</h2>
      <p>Мы собрали «Аркаду» по выводам исследований — и честно говорим, где их границы.</p>
      <ul>
        <li><b>Тренируется то, что тренируешь.</b> Обзор всех исследований «brain training» показал: результат в самих играх растёт, а перенос на жизнь доказан слабо. Поэтому мы качаем <b>много разных навыков</b>, а не одну игру. ${link('https://news.illinois.edu/review-finds-little-evidence-that-brain-training-games-yield-real-world-benefits/', 'Simons et al., 2016')}</li>
        <li><b>Скорость обработки информации</b> — единственная тренировка с долгим эффектом в большом исследовании ACTIVE: эффект рос с числом занятий. В тренировке дня всегда есть игра на скорость или внимание. ${link('https://pmc.ncbi.nlm.nih.gov/articles/PMC5700828', 'Edwards et al., 2017')}</li>
        <li><b>Комплексный подход</b> — питание, движение, тренировки ума и здоровье сосудов вместе — улучшил когнитивные тесты пожилых людей. Игры — лишь часть. ${link('https://news.ki.se/brain-training-and-healthy-lifestyle-may-slow-down-cognitive-decline', 'FINGER, 2015')}</li>
        <li><b>Освоение нового сложного навыка</b> улучшает память сильнее, чем просто приятное времяпрепровождение. Отсюда раздел «Учёба» и уровни. ${link('https://pubmed.ncbi.nlm.nih.gov/24214244/', 'Park et al., 2014')}</li>
        <li><b>Вспоминать и повторять с интервалами</b> — один из самых надёжных способов учиться. Карточки работают именно так. ${link('https://link.springer.com/10.1007/s10648-020-09572-8', 'метаанализ, 2020')}</li>
        <li><b>Динамичные игры</b> тренируют внимание и пространственное мышление. ${link('https://archive-ouverte.unige.ch/unige:101941', 'Bediou et al., 2018')}</li>
      </ul>
      <p><b>Чего мы не обещаем:</b> рост IQ, защиту от деменции или лечение чего-либо. Игры — это весёлая и полезная разминка, а не лекарство.</p></div>`;
  }

  function settings() {
    if (!prof) return guest() + '<div class="panel"><p class="tip">Без входа через Telegram настройки сохраняются только на этом устройстве.</p></div>';
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
      <div class="panel"><h2>⏰ Напоминание</h2>
        <div class="switch"><span>Напоминать о тренировке дня</span><button class="toggle ${r.on ? 'on' : ''}" data-act="toggle"></button></div>
        <div class="switch"><span>Время</span><input type="time" value="${esc(r.time)}" data-act="time"></div>
        <p class="tip" data-rem>${r.on && !r.can_write ? '⚠️ Бот не смог написать тебе. Открой чат с ботом и нажми «Старт», затем включи заново.' : 'Пришлю одно сообщение в личку, только если тренировка ещё не сделана.'}</p>
      </div>
      ${Object.entries(groups).map(([g, list]) => `<div class="panel"><h2>${esc(g)}</h2>${list.map(row).join('')}</div>`).join('')}
      <div class="panel"><p class="tip">Настройки группы (турниры, дуэли, объявления о рекордах) — команда /settings в самой группе, для админов.</p>
        <button class="btn ghost" style="width:100%" data-act="reset">↺ Сбросить мои настройки</button></div>`;
  }

  async function setPref(key, value) {
    prof.prefs[key] = value;
    window.ArcadePrefs.save({ [key]: value }); // применяем сразу (тема, текст, анимации)
    render(true);
    try { prof.prefs = (await api('settings', { changes: { [key]: value } })).prefs; } catch (e) { /* локально уже сохранено */ }
  }

  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  // ---------- рендер и события ----------
  function render() {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const keep = view.scrollTop;
    view.innerHTML = { today, games, profile, science, settings }[tab]();
    view.scrollTop = arguments[0] ? keep : 0;
  }
  view.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-play],[data-sec],[data-tab],[data-act],[data-link],[data-set],[data-av]');
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
      if (!allowed) { const p = view.querySelector('[data-rem]'); if (p) p.textContent = 'Без разрешения бот не сможет присылать напоминания.'; return; }
    }
    try {
      await api('reminder', { on, time });
      prof.reminder = { on, time, can_write: true };
      haptic(); render();
    } catch (err) { const p = view.querySelector('[data-rem]'); if (p) p.textContent = err.message; }
  }

  (async () => {
    view.innerHTML = '<p class="center muted">Загружаю…</p>';
    try { cat = await (await fetch('games/catalog.json', { cache: 'no-cache' })).json(); } catch (e) { view.textContent = 'Нет связи с сервером'; return; }
    if (authed) { try { prof = await api('profile'); window.ArcadePrefs.save(prof.prefs); } catch (e) { prof = null; } } // синхронизация настроек на это устройство
    const want = qs.get('tab');
    if (want) tab = want;
    render();
  })();
})();
