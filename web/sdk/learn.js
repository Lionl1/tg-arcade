/* Движок раздела «Учёба»: колода — это данные, режимы — «учить карточки» и «тест на очки».
 *
 *   Arcade.register(Learn.deck({
 *     ask: 'Столица страны',                 // подпись над вопросом
 *     cards: [['Франция', 'Париж'], ...],    // [вопрос, ответ, ...неверные варианты (необязательно)]
 *     both: true,                            // спрашивать в обе стороны (слово ↔ перевод)
 *     big: true,                             // крупный вопрос (флаги, символы)
 *     reveal: (card) => 'текст после ответа',// например, слово целиком
 *     rule: 'Правило для режима карточек',
 *     gen: (api) => ({ q, a, wrong: [...] }),// вместо cards — генератор вопросов (только тест)
 *     seconds: 60,
 *   }));
 */
(() => {
  'use strict';

  const keyOf = (c) => c.q + '→' + c.a;

  // Флаги как картинки Twemoji (CC BY 4.0): на Windows системные эмодзи флагов не рисуются
  const FLAG_RE = /([\u{1F1E6}-\u{1F1FF}]{2})/gu;
  const TWEMOJI = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';
  const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function setQ(el, text, big) {
    text = String(text);
    el.classList.toggle('long', text.length > 38);
    if (!FLAG_RE.test(text)) { el.textContent = text; return; }
    FLAG_RE.lastIndex = 0;
    el.innerHTML = escH(text).replace(FLAG_RE, (f) => {
      const code = [...f].map((ch) => ch.codePointAt(0).toString(16)).join('-');
      return `<img src="${TWEMOJI}${code}.svg" alt="${f}" style="height:${big ? '1em' : '1.1em'};vertical-align:-0.15em">`;
    });
  }

  function normalize(cards, both) {
    const base = cards.map((c) => (Array.isArray(c)
      ? { q: String(c[0]), a: String(c[1]), wrong: c.length > 2 ? c.slice(2).map(String) : null }
      : { ...c, q: String(c.q), a: String(c.a) }));
    return both ? base.concat(base.map((c) => ({ q: c.a, a: c.q, g: c.g, d: c.d, rev: true }))) : base;
  }

  function options(card, pool, api) {
    if (card.pool) return api.shuffle([card.a, ...api.shuffle(card.pool.filter((x) => x !== card.a)).slice(0, 3)]); // свой набор неверных
    if (card.wrong) return api.shuffle([card.a, ...card.wrong]);
    // неверные варианты — сначала из той же группы (часть света, тема): так сложнее и полезнее
    const same = pool.filter((c) => !!c.rev === !!card.rev && c.a !== card.a);
    const near = card.g ? same.filter((c) => c.g === card.g) : [];
    const others = [...new Set(api.shuffle(near).map((c) => c.a).concat(api.shuffle(same).map((c) => c.a)))];
    return api.shuffle([card.a, ...others.slice(0, 3)]);
  }

  // Интервальные повторения (коробки Лейтнера): после «Знаю» карточка вернётся через 1 → 3 → 7 → 14 → 30 дней
  const DAY = 86400000;
  const INTERVALS = [1, 3, 7, 14, 30];
  function loadBoxes(id) {
    try {
      const raw = JSON.parse(localStorage.getItem('arcade:learn:' + id));
      if (Array.isArray(raw)) return Object.fromEntries(raw.map((k) => [k, { box: 1, due: 0 }])); // старый формат
      return raw || {};
    } catch (e) { return {}; }
  }
  function saveBoxes(id, boxes) {
    try { localStorage.setItem('arcade:learn:' + id, JSON.stringify(boxes)); } catch (e) { /* noop */ }
  }

  function deck(cfg) {
    const all = cfg.cards ? normalize(cfg.cards, cfg.both) : null;
    const total = cfg.cards ? cfg.cards.length : 0;

    // ---------- тест на очки ----------
    function test(api) {
      api.stage.innerHTML = '';
      const tm = api.timer(cfg.seconds || 60);
      const box = api.el('div', 'fill');
      const label = api.el('div', 'hint', box, cfg.ask || '');
      const q = api.el('div', 'learn-q' + (cfg.big ? ' big' : ''), box);
      const fb = api.el('div', 'hint', box, '');
      fb.style.minHeight = '1.4em';
      const ch = api.el('div', 'choices learn', box);
      // сложность карточек (d: 1 базовая, 2 средняя, 3 продвинутая): уровни и рост счёта открывают более трудные
      const DNAME = ['', ...L('базовые|средние|продвинутые', 'basic|intermediate|advanced').split('|')];
      const hasD = all && all.some((c) => (c.d || 1) > 1);
      const band = () => {
        if (api.mode === 'level') { const k = api.level; return [k >= 12 ? 2 : 1, k <= 3 ? 1 : k <= 8 ? 2 : 3]; }
        return [1, api.score < 6 ? 1 : api.score < 14 ? 2 : 3];
      };
      const poolNow = () => {
        if (!hasD) return all;
        const [lo, hi] = band();
        const p = all.filter((c) => (c.d || 1) >= lo && (c.d || 1) <= hi);
        return p.length >= 6 ? p : all;
      };
      let bandKey = '', order = null, i = 0, card = null, lock = false, cancelQ = () => {};
      const limitBar = api.el('div', 'qbar', box);
      // постепенное усложнение: после разминки на ответ даётся всё меньше времени
      const limit = () => (api.score >= 5 ? Math.max(2500, 9000 - (api.score - 5) * 250) : 0);
      function timeout() {
        if (lock) return;
        lock = true; tm.add(-3); api.haptic('error');
        for (const o of ch.children) if (o.dataset.v === card.a) o.style.background = 'var(--good)';
        fb.textContent = L('⏱ Время! ', '⏱ Time! ') + (cfg.reveal ? cfg.reveal(card) : `${card.q} → ${card.a}`);
        api.after(1100, next);
      }

      function next() {
        cancelQ();
        if (cfg.gen) card = cfg.gen(api);
        else {
          const bk = band().join('-');
          if (bk !== bandKey) { bandKey = bk; order = api.shuffle(poolNow()); i = 0; } // открылись более сложные карточки
          if (i >= order.length) { order = api.shuffle(poolNow()); i = 0; }
          card = order[i++];
        }
        card.a = String(card.a);
        label.textContent = (card.ask || (card.rev && cfg.askRev) || cfg.ask || '') + (hasD ? ` · ${DNAME[card.d || 1]}` : '');
        q.className = 'learn-q' + (cfg.big && !card.rev ? ' big' : '') + (cfg.mono ? ' code' : ''); // mono — вопрос-код (трассировка)
        setQ(q, card.q, cfg.big && !card.rev);
        fb.textContent = '';
        ch.innerHTML = '';
        for (const v of (cfg.gen ? api.shuffle([card.a, ...[...new Set(card.wrong.map(String))].filter((w) => w !== card.a).slice(0, 3)]) : options(card, all, api))) {
          const b = api.el('button', 'btn ghost', ch); b.dataset.v = v; setQ(b, v);
        }
        lock = false;
        const lim = limit();
        limitBar.style.transition = 'none'; limitBar.style.width = lim ? '100%' : '0';
        if (lim) {
          requestAnimationFrame(() => { limitBar.style.transition = `width ${lim}ms linear`; limitBar.style.width = '0'; });
          cancelQ = api.after(lim, timeout);
        } else cancelQ = () => {};
      }
      api.on(ch, 'pointerdown', (e) => {
        const b = e.target.closest('button');
        if (!b || lock) return;
        lock = true; cancelQ();
        if (b.dataset.v === card.a) {
          api.addScore(1); api.haptic('light'); api.tone(820, 50);
          b.style.background = 'var(--good)';
          api.after(220, next);
        } else {
          tm.add(-3); api.haptic('error');
          b.style.background = 'var(--bad)';
          for (const o of ch.children) if (o.dataset.v === card.a) o.style.background = 'var(--good)';
          fb.textContent = cfg.reveal ? cfg.reveal(card) : `${card.q} → ${card.a}`;
          api.after(1100, next);
        }
      });
      next();
    }

    // ---------- карточки (без очков) ----------
    function study(api) {
      api.stage.innerHTML = '';
      api.setScore(null);
      const boxes = loadBoxes(api.gameId);
      const now = Date.now();
      const back = api.el('button', 'backlink', api.stage, L('← Меню', '← Menu'));
      api.on(back, 'click', () => api.quit());
      const box = api.el('div', 'fill');
      const progress = api.el('div', 'hint', box);
      if (cfg.rule) { const r = api.el('div', 'hint', box, cfg.rule); r.style.fontSize = '13px'; }
      const card = api.el('div', 'flash', box);
      const row = api.el('div', 'row', box);
      row.style.cssText = 'width:100%;max-width:380px;visibility:hidden';
      const again = api.el('button', 'btn ghost', row, L('😕 Ещё раз', '😕 Again'));
      const know = api.el('button', 'btn', row, L('😎 Знаю', '😎 I know it'));

      // сначала то, что пора повторить (самые «старые» долги первыми), потом новые карточки
      const due = all.filter((c) => boxes[keyOf(c)] && boxes[keyOf(c)].due <= now)
        .sort((x, y) => boxes[keyOf(x)].due - boxes[keyOf(y)].due);
      const fresh = api.shuffle(all.filter((c) => !boxes[keyOf(c)])).sort((x, y) => (x.d || 1) - (y.d || 1)); // от простых к сложным
      const batch = (window.ArcadePrefs && window.ArcadePrefs.get('learn_batch')) || 20; // настройка «карточек за подход»
      let queue = due.slice(0, batch).concat(fresh.slice(0, Math.max(0, batch - due.length)));
      const size = queue.length, reviews = Math.min(batch, due.length);
      let learned = 0, flipped = false;

      const nextDue = () => {
        const t = Object.values(boxes).map((b) => b.due).filter((d) => d > Date.now()).sort((a, b) => a - b)[0];
        return t ? Math.max(1, Math.ceil((t - Date.now()) / DAY)) : null;
      };
      function draw() {
        const sure = all.filter((c) => boxes[keyOf(c)] && boxes[keyOf(c)].box >= 2).length;
        progress.textContent = L(`Партия: ${learned}/${size}${reviews ? ` (повторений ${reviews})` : ''} · уверенно знаешь ${sure} из ${all.length}`,
          `Session: ${learned}/${size}${reviews ? ` (${reviews} reviews)` : ''} · you know ${sure} of ${all.length} well`);
        if (!queue.length) return finish();
        const c = queue[0];
        flipped = false;
        row.style.visibility = 'hidden';
        card.innerHTML = '';
        const b = boxes[keyOf(c)];
        api.el('div', 'hint', card, (b ? L('🔁 повторение · ', '🔁 review · ') : '🆕 ') + (c.rev ? (cfg.askRev || cfg.ask || '') : (cfg.ask || '')));
        setQ(api.el('div', 'learn-q' + (cfg.big && !c.rev ? ' big' : ''), card), c.q, cfg.big && !c.rev);
        api.el('div', 'hint', card, L('вспомни ответ и нажми, чтобы проверить', 'recall the answer, then tap to check'));
      }
      function flip() {
        if (flipped || !queue.length) return;
        flipped = true;
        const c = queue[0];
        card.lastChild.remove();
        api.el('div', 'back', card, c.a);
        if (cfg.reveal && !c.rev) api.el('div', 'hint', card, cfg.reveal(c));
        row.style.visibility = '';
        api.haptic('select');
      }
      function finish() {
        card.remove(); row.remove();
        const done = api.el('div', '', box);
        const nd = nextDue();
        done.innerHTML = size
          ? L(`<div class="learn-q">🎉 Партия пройдена!</div><p class="hint">Карточек: ${size}. ${nd ? `Следующее повторение — через ${nd} дн. Интервальные повторения запоминаются надёжнее зубрёжки.` : ''}</p>`,
            `<div class="learn-q">🎉 Session complete!</div><p class="hint">Cards: ${size}. ${nd ? `Next review in ${nd} days. Spaced repetition sticks better than cramming.` : ''}</p>`)
          : L(`<div class="learn-q">🏅 На сегодня всё повторено</div><p class="hint">${nd ? `Следующие карточки вернутся через ${nd} дн.` : ''} Можно проверить себя на очки.</p>`,
            `<div class="learn-q">🏅 All reviewed for today</div><p class="hint">${nd ? `The next cards come back in ${nd} days.` : ''} You can test yourself for points.</p>`);
        const btns = api.el('div', 'modes', box);
        const more = api.el('button', 'btn ghost', btns, size ? L('📖 Ещё карточки', '📖 More cards') : L('🔄 Начать колоду заново', '🔄 Restart the deck'));
        const check = api.el('button', 'btn', btns, L('🎯 Проверить себя на очки', '🎯 Test yourself for points'));
        api.on(more, 'click', () => { if (!size) saveBoxes(api.gameId, {}); study(api); });
        api.on(check, 'click', () => test(api));
      }
      api.on(card, 'click', flip);
      api.on(know, 'click', () => {
        const c = queue.shift(), k = keyOf(c), b = boxes[k] || { box: 0 };
        const nb = Math.min(INTERVALS.length, b.box + 1);
        boxes[k] = { box: nb, due: Date.now() + INTERVALS[nb - 1] * DAY };
        saveBoxes(api.gameId, boxes);
        learned++; api.haptic('light'); draw();
      });
      api.on(again, 'click', () => {
        const c = queue.shift(), k = keyOf(c);
        if (boxes[k]) boxes[k] = { box: 0, due: 0 }; // забыл — интервал сначала
        saveBoxes(api.gameId, boxes);
        queue.splice(Math.min(3, queue.length), 0, c);
        api.haptic('select'); draw();
      });
      draw();
    }

    return {
      cfg, // для автопроверки колод (tools/check_games.mjs)
      howto: cfg.howto || (all
        ? L(`${total} карточек. «Учить» — карточки с интервальными повторениями (выученное вернётся через 1, 3, 7… дней). «Тест» — ${cfg.seconds || 60} секунд на очки, ошибка −3 с.`,
          `${total} cards. “Learn” — flashcards with spaced repetition (learned cards return after 1, 3, 7… days). “Test” — ${cfg.seconds || 60} seconds for points, a mistake costs 3 s.`)
        : L(`Тест на ${cfg.seconds || 60} секунд: выбирай правильный ответ, ошибка −3 с.`, `A ${cfg.seconds || 60}-second test: pick the right answer, a mistake costs 3 s.`)),
      start(api) {
        if (!all || api.mode !== 'free') return test(api); // уровни, турниры, дуэли — только тест на очки
        const box = api.el('div', 'fill');
        api.el('div', 'learn-q', box, L('Как будем?', 'How shall we go?'));
        const modes = api.el('div', 'modes', box);
        const s = api.el('button', 'btn ghost', modes);
        s.innerHTML = L('📖 Учить карточки<small>Без очков, в своём темпе. Запомню, что ты уже знаешь.</small>', "📖 Learn the cards<small>No points, at your own pace. I'll remember what you already know.</small>");
        const t = api.el('button', 'btn', modes);
        t.innerHTML = L(`🎯 Тест на очки<small>${cfg.seconds || 60} секунд, результат идёт в таблицу чата.</small>`, `🎯 Test for points<small>${cfg.seconds || 60} seconds, the result goes to the chat leaderboard.</small>`);
        api.on(s, 'click', () => study(api));
        api.on(t, 'click', () => test(api));
      },
    };
  }

  /** n неверных вариантов-чисел рядом с правильным (для генераторов). */
  function nearNumbers(api, ans, n = 3, spread = 3) {
    const out = new Set();
    let guard = 0;
    while (out.size < n && guard++ < 100) {
      const d = (api.randi(spread) + 1) * (api.rand() < 0.5 ? -1 : 1);
      if ((ans <= 0 || ans + d > 0) && d !== 0) out.add(ans + d); // для отрицательных ответов допускаем и отрицательные варианты
    }
    return [...out];
  }

  /** Колода из JSON-файла: Learn.load('games/data/x.json', (data) => ({...cfg})) */
  function load(url, build) {
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((data) => Arcade.register(deck(build(data))))
      .catch(() => Arcade.fail(L('Не удалось загрузить карточки. Проверь связь и открой игру заново.', "Couldn't load the cards. Check your connection and reopen the game.")));
  }

  window.Learn = { deck, load, nearNumbers, _options: options, _normalize: normalize };
})();
