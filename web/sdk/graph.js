/* Граф знаний в профиле: в центре — игрок, вокруг — 10 навыков, внешнее кольцо — темы (группы разделов).
 * Размер узла — уровень/опыт, линии «тема → навык» — сколько опыта тема дала навыку.
 * Прирост с прошлого раза (после сыгранных партий) подсвечивается пульсом и «+N».
 *   KnowledgeGraph.html(prof, games)  → разметка панели
 *   KnowledgeGraph.bind(root, prof)   → тапы по узлам (подробности) */
window.KnowledgeGraph = (() => {
  'use strict';
  const KEY = 'arcade:graph';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emojiOf = (t) => (String(t).match(/^\S+/) || [''])[0];
  const nameOf = (t) => String(t).replace(/^\S+\s*/, '');
  const COG = ['speed', 'attention', 'memory', 'flex', 'logic', 'spatial', 'math', 'language'];

  // снимок «как было в прошлый раз»: базовая линия меняется, только когда данные изменились (сыграли партии)
  function deltas(prof) {
    const now = { s: Object.fromEntries(prof.skills.map((s) => [s.id, s.xp])), t: Object.fromEntries(prof.graph.topics.map((t) => [t.id, t.xp])) };
    let st = {};
    try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* приватный режим */ }
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!st.last) st = { base: now, last: now };
    else if (!same(st.last, now)) st = { base: st.last, last: now, at: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* noop */ }
    const d = { s: {}, t: {} };
    for (const k in now.s) d.s[k] = Math.max(0, Math.round(now.s[k] - ((st.base.s || {})[k] || 0)));
    for (const k in now.t) d.t[k] = Math.max(0, Math.round(now.t[k] - ((st.base.t || {})[k] || 0)));
    return d;
  }

  function layout(prof) {
    const W = 360, C = W / 2, R1 = 82, R2 = 150;
    const skills = prof.skills.map((s, i) => {
      const a = -Math.PI / 2 + (i / prof.skills.length) * Math.PI * 2;
      return { ...s, a, x: C + R1 * Math.cos(a), y: C + R1 * Math.sin(a), r: Math.min(24, 11 + s.level * 1.6) };
    });
    const sk = Object.fromEntries(skills.map((s) => [s.id, s]));
    // темы — по кругу рядом со «своими» навыками: сортируем по среднему углу связанных навыков
    const topics = prof.graph.topics.map((t) => {
      let sx = 0, sy = 0;
      for (const [id, w] of Object.entries(t.links)) if (sk[id]) { sx += Math.cos(sk[id].a) * (w + 1); sy += Math.sin(sk[id].a) * (w + 1); }
      return { ...t, pref: Math.atan2(sy, sx) };
    }).sort((p, q) => p.pref - q.pref);
    const maxXp = Math.max(1, ...topics.map((t) => t.xp));
    topics.forEach((t, i) => {
      t.a = -Math.PI / 2 + (i / topics.length) * Math.PI * 2 + 0.11;
      t.x = C + R2 * Math.cos(t.a); t.y = C + R2 * Math.sin(t.a);
      t.r = t.xp ? 7 + 9 * Math.sqrt(t.xp / maxXp) : 5;
    });
    return { W, C, skills, sk, topics };
  }

  function html(prof) {
    if (!prof.graph || !prof.graph.topics.length) return '';
    const { W, C, skills, sk, topics } = layout(prof);
    const d = deltas(prof);
    const maxLink = Math.max(1, ...topics.flatMap((t) => Object.values(t.links)));
    let edges = '', nodes = '';
    for (const s of skills) edges += `<line x1="${C}" y1="${C}" x2="${s.x}" y2="${s.y}" class="kg-e0"/>`;
    for (const t of topics) for (const [id, w] of Object.entries(t.links)) {
      if (!sk[id] || w < 1) continue;
      const k = w / maxLink;
      edges += `<line x1="${t.x}" y1="${t.y}" x2="${sk[id].x}" y2="${sk[id].y}" class="kg-e${d.t[t.id] ? ' kg-new' : ''}" style="stroke-width:${(0.8 + 2.6 * k).toFixed(2)};opacity:${(0.2 + 0.6 * k).toFixed(2)}"/>`;
    }
    for (const t of topics) {
      const grew = d.t[t.id];
      nodes += `<g class="kg-n kg-topic${t.xp ? '' : ' kg-ghost'}${grew ? ' kg-grew' : ''}" data-kg="t:${esc(t.id)}">
        <circle cx="${t.x}" cy="${t.y}" r="${t.r}"/><text x="${t.x}" y="${t.y + 4}">${esc(emojiOf(t.title))}</text>
        ${grew ? `<text class="kg-plus" x="${t.x}" y="${t.y - t.r - 3}">+${grew}</text>` : ''}</g>`;
    }
    for (const s of skills) {
      const grew = d.s[s.id];
      nodes += `<g class="kg-n kg-skill${grew ? ' kg-grew' : ''}" data-kg="s:${s.id}">
        <circle cx="${s.x}" cy="${s.y}" r="${s.r}"/><text x="${s.x}" y="${s.y + 1}">${esc(emojiOf(s.title))}</text>
        <text class="kg-lv" x="${s.x}" y="${s.y + s.r + 11}">${s.level}</text>
        ${grew ? `<text class="kg-plus" x="${s.x + s.r}" y="${s.y - s.r}">+${grew}</text>` : ''}</g>`;
    }
    nodes += `<g class="kg-n kg-me" data-kg="me"><circle cx="${C}" cy="${C}" r="27"/><text x="${C}" y="${C - 2}">${esc(prof.avatar || '🧠')}</text>
      <text class="kg-lv" x="${C}" y="${C + 15}">${L('ур.', 'lv.')} ${prof.level}</text></g>`;
    const totalGrow = Object.values(d.s).reduce((a, b) => a + b, 0);
    return `<div class="panel" id="graph"><h2>${L('🕸 Граф знаний', '🕸 Knowledge graph')}</h2>
      <p class="tip" style="margin:-4px 0 6px">${totalGrow
        ? L(`После последних игр: +${totalGrow} XP в навыки — выросшие узлы пульсируют.`, `Since your last games: +${totalGrow} XP to skills — the nodes that grew are pulsing.`)
        : L('В центре — ты, вокруг — навыки, снаружи — темы. Чем больше узел, тем больше опыта; линии — какие темы качают какие навыки.', 'You are in the middle, skills around you, topics outside. Bigger nodes mean more XP; lines show which topics train which skills.')}</p>
      <svg class="kg" viewBox="0 0 ${W} ${W}">${edges}${nodes}</svg>
      <div class="kg-info tip">${L('Тапни узел, чтобы узнать подробности.', 'Tap a node for details.')}</div>
      ${directions(prof, d)}</div>`;
  }

  // направления развития: сильная сторона, быстрее всего растёт, куда расти дальше
  function directions(prof, d) {
    const cog = prof.skills.filter((s) => COG.includes(s.id));
    const strong = prof.skills.slice().sort((a, b) => b.xp - a.xp)[0];
    const growing = prof.skills.slice().sort((a, b) => (d.s[b.id] || 0) - (d.s[a.id] || 0))[0];
    const weak = cog.slice().sort((a, b) => a.xp - b.xp)[0];
    const learned = prof.graph.topics.filter((t) => t.xp > 0).length;
    const balance = Math.round((100 * cog.filter((s) => s.level >= 2).length) / cog.length);
    const next = prof.graph.topics.filter((t) => ['brain', 'ege', 'learn', 'algo'].includes(t.section) && t.played < t.games)
      .sort((a, b) => (b.links[weak.id] || 0) - (a.links[weak.id] || 0) || a.played / a.games - b.played / b.games)[0];
    const card = (icon, title, body) => `<div class="kg-dir"><span>${icon}</span><div><b>${title}</b><small>${body}</small></div></div>`;
    return `<div class="kg-dirs">
      ${card('💪', L('Сильная сторона', 'Strength'), `${esc(strong.title)} · ${L('ур.', 'lv.')} ${strong.level}`)}
      ${d.s[growing.id] ? card('🚀', L('Растёт быстрее всего', 'Growing fastest'), `${esc(growing.title)} · +${d.s[growing.id]} XP`) : ''}
      ${card('🧭', L('Куда расти', 'Where to grow'), `${esc(weak.title)}${next && nameOf(next.title) !== nameOf(weak.title) ? ` · ${L('попробуй тему', 'try')} ${esc(next.title)}` : next ? ` · ${L('сыграно', 'played')} ${next.played}/${next.games}` : ''}`)}
      ${card('🌐', L('Широта', 'Breadth'), L(`изучено тем: ${learned} из ${prof.graph.topics.length} · баланс навыков ${balance}%`, `topics explored: ${learned} of ${prof.graph.topics.length} · skill balance ${balance}%`))}
    </div>`;
  }

  function bind(root, prof, games) {
    const svg = root.querySelector('.kg');
    if (!svg) return;
    const info = root.querySelector('.kg-info');
    svg.addEventListener('click', (e) => {
      const n = e.target.closest('[data-kg]');
      if (!n) return;
      svg.querySelectorAll('.kg-sel').forEach((x) => x.classList.remove('kg-sel'));
      n.classList.add('kg-sel');
      const [kind, id] = n.dataset.kg.split(/:(.+)/);
      if (kind === 'me') { info.innerHTML = `<b>${esc(prof.nickname || prof.name)}</b> · ${L('уровень', 'level')} ${prof.level} · ${prof.xp} XP`; return; }
      if (kind === 's') {
        const s = prof.skills.find((x) => x.id === id);
        const tops = prof.graph.topics.filter((t) => (t.links[id] || 0) >= 1).slice(0, 3).map((t) => esc(t.title)).join(', ');
        info.innerHTML = `<b>${esc(s.title)}</b> · ${L('ур.', 'lv.')} ${s.level} · ${s.xp} XP<br>${esc(s.desc)}${tops ? `<br>${L('Качают', 'Trained by')}: ${tops}` : ''}`;
        return;
      }
      const t = prof.graph.topics.find((x) => x.id === id);
      const sug = games.filter((g) => g.section === t.section && (g.group || '') === (id.split(':')[1] || '') && !(prof.games[g.id] && prof.games[g.id].plays)).slice(0, 1)[0];
      info.innerHTML = `<b>${esc(t.title)}</b> <small>(${esc(nameOf(t.section_title))})</small> · ${t.xp} XP<br>${L('Сыграно игр', 'Games played')}: ${t.played} ${L('из', 'of')} ${t.games}`
        + (sug ? `<br><button class="btn ghost kg-go" data-play="${sug.id}">${sug.emoji} ${L('Попробовать', 'Try')}: ${esc(sug.title)}</button>` : '');
    });
  }

  return { html, bind };
})();
