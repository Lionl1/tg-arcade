/* Движок визуализаций алгоритмов: кадры заранее считаются в run(), дальше — плеер с шагом вперёд/назад.
 *
 *   Arcade.register(Algo.viz({
 *     about: 'Короткое объяснение идеи',
 *     complexity: 'O(n²) время · O(1) память',
 *     code: ['строка псевдокода', ...],
 *     make(api) → входные данные (случайные через api.rand),
 *     run(data) → [{ s: состояние, l: строка кода, t: пояснение }, ...],
 *     draw(ctx, W, H, frame, colors),
 *   }));
 */
(() => {
  'use strict';

  function viz(cfg) {
    return {
      app: true,
      start(api) {
        const C = api.colors;
        const box = api.el('div', 'appbox');
        box.style.gap = '8px';
        const about = api.el('div', 'hint', box);
        about.innerHTML = `${cfg.about}${cfg.complexity ? `<br><b>Сложность:</b> ${cfg.complexity}` : ''}`;
        about.style.cssText = 'font-size:13px;line-height:1.35';
        const wrap = api.el('div', '', box);
        wrap.style.cssText = 'flex:1;min-height:180px;position:relative;border-radius:14px;background:var(--card);overflow:hidden';
        const cv = api.el('canvas', '', wrap);
        cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
        const note = api.el('div', '', box);
        note.style.cssText = 'min-height:2.6em;font-size:14px;font-weight:600;text-align:center';
        // вкладки: псевдокод (с подсветкой текущей строки) и настоящий код на Python / JavaScript (проверен автотестами)
        const real = (window.ALGO_CODE || {})[api.gameId];
        const tabs = api.el('div', 'seg', box);
        tabs.style.margin = '0';
        const TABS = [['pseudo', 'Псевдокод']].concat(real ? [['py', 'Python'], ['js', 'JavaScript']] : []);
        const code = api.el('pre', '', box);
        code.style.cssText = 'margin:0;padding:8px 10px;border-radius:12px;background:color-mix(in srgb, var(--fg) 6%, transparent);font:12px/1.45 ui-monospace,Menlo,monospace;overflow:auto;max-height:24vh;-webkit-user-select:text;user-select:text';
        let lines = [];
        function showTab(t) {
          [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.t === t));
          code.innerHTML = '';
          const src = t === 'pseudo' ? cfg.code : real[t].split('\n');
          lines = src.map((txt) => { const d = document.createElement('div'); d.textContent = txt || ' '; d.style.cssText = 'padding:0 4px;border-radius:4px;white-space:pre'; code.appendChild(d); return d; });
          if (t !== 'pseudo') lines = []; // подсветка шагов — только в псевдокоде
          copyBtn.hidden = t === 'pseudo';
          copyBtn.dataset.t = t;
          render();
        }
        for (const [t, label] of TABS) { const b = api.el('button', '', tabs, label); b.dataset.t = t; api.on(b, 'click', () => showTab(t)); }
        const copyBtn = api.el('button', '', tabs, '📋 Копировать');
        copyBtn.hidden = true;
        api.on(copyBtn, 'click', async () => {
          try { await navigator.clipboard.writeText(real[copyBtn.dataset.t]); api.toast('Код скопирован'); } catch (e) { api.toast('Выдели код и скопируй вручную'); }
        });
        const bar = api.el('div', 'toolbar', box);
        const bNew = api.el('button', 'btn ghost', bar, '🔀');
        const bBack = api.el('button', 'btn ghost', bar, '◀');
        const bPlay = api.el('button', 'btn', bar, '▶ Пуск');
        const bStep = api.el('button', 'btn ghost', bar, '▶|');
        const bSpeed = api.el('button', 'btn ghost', bar, '');
        const SPEEDS = [[1500, '×0.5'], [700, '×1'], [300, '×2'], [90, '×5']];
        let frames = [], i = 0, playing = false, timer = null, ctx, W = 0, H = 0;
        let sp = window.ArcadePrefs ? window.ArcadePrefs.get('algo_speed') : 1; // настройка скорости анимации

        function fit() {
          const r = wrap.getBoundingClientRect(), d = window.devicePixelRatio || 1;
          W = r.width; H = r.height;
          cv.width = Math.round(W * d); cv.height = Math.round(H * d);
          ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
          render();
        }
        function render() {
          if (!ctx || !frames.length) return;
          const f = frames[i];
          ctx.clearRect(0, 0, W, H);
          cfg.draw(ctx, W, H, f, C, api);
          note.textContent = `${i + 1}/${frames.length} · ${f.t || ''}`;
          lines.forEach((d, k) => { d.style.background = k === f.l ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : ''; });
          if (lines[f.l]) lines[f.l].scrollIntoView({ block: 'nearest' });
        }
        function stop() { playing = false; clearTimeout(timer); bPlay.textContent = '▶ Пуск'; }
        function tick() {
          if (!playing) return;
          if (i < frames.length - 1) { i++; render(); timer = setTimeout(tick, SPEEDS[sp][0]); }
          else stop();
        }
        function fresh() {
          stop();
          frames = cfg.run(cfg.make(api));
          i = 0; render();
        }
        api.on(bPlay, 'click', () => {
          if (playing) return stop();
          if (i >= frames.length - 1) i = 0;
          playing = true; bPlay.textContent = '⏸ Пауза'; tick();
        });
        api.on(bStep, 'click', () => { stop(); if (i < frames.length - 1) { i++; render(); } });
        api.on(bBack, 'click', () => { stop(); if (i > 0) { i--; render(); } });
        api.on(bNew, 'click', () => { fresh(); api.haptic('select'); });
        api.on(bSpeed, 'click', () => { sp = (sp + 1) % SPEEDS.length; bSpeed.textContent = SPEEDS[sp][1]; });
        bSpeed.textContent = SPEEDS[sp][1];
        api.on(window, 'resize', fit);
        api.onDispose(() => clearTimeout(timer));
        frames = cfg.run(cfg.make(api));
        showTab('pseudo');
        requestAnimationFrame(fit);
      },
    };
  }

  // ---------- общие отрисовщики ----------

  /** Столбики массива: s = { a, hi: {индекс: цвет}, done: [индексы], range: [l, r], marks: {индекс: подпись} } */
  function bars(ctx, W, H, f, C) {
    const { a, hi = {}, done = [], range, marks = {} } = f.s;
    const n = a.length, pad = 10, gap = 4, bw = (W - pad * 2 - gap * (n - 1)) / n, max = Math.max(...a, 1);
    if (range) { ctx.fillStyle = 'rgba(127,127,127,.12)'; ctx.fillRect(pad + range[0] * (bw + gap) - 2, 0, (range[1] - range[0] + 1) * (bw + gap), H); }
    a.forEach((v, k) => {
      const h = ((H - 46) * v) / max, x = pad + k * (bw + gap), y = H - 22 - h;
      ctx.fillStyle = hi[k] ? C[hi[k]] || hi[k] : done.includes(k) ? C.good : C.accent;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, bw, h, 4) : ctx.rect(x, y, bw, h); ctx.fill();
      ctx.fillStyle = C.fg; ctx.font = `600 ${Math.min(13, bw * 0.55)}px system-ui`; ctx.textAlign = 'center';
      ctx.fillText(v, x + bw / 2, H - 6);
      if (marks[k]) { ctx.fillStyle = C.warn; ctx.fillText(marks[k], x + bw / 2, y - 6); }
    });
  }

  /** Сетка для поиска пути: s = { cols, rows, cells: Uint8Array(0 пусто,1 стена,2 в очереди,3 посещена,4 путь), start, goal } */
  function grid(ctx, W, H, f, C) {
    const { cols, rows, cells, start, goal } = f.s;
    const c = Math.min((W - 8) / cols, (H - 8) / rows), ox = (W - c * cols) / 2, oy = (H - c * rows) / 2;
    const col = ['transparent', C.hint, 'rgba(227,179,65,.55)', 'rgba(74,144,226,.45)', C.good];
    for (let k = 0; k < cols * rows; k++) {
      const x = ox + (k % cols) * c, y = oy + Math.floor(k / cols) * c;
      ctx.fillStyle = col[cells[k]] || 'transparent';
      ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
      ctx.strokeStyle = 'rgba(127,127,127,.15)'; ctx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
    }
    ctx.font = `${c * 0.7}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🟢', ox + (start % cols) * c + c / 2, oy + Math.floor(start / cols) * c + c / 2);
    ctx.fillText('🏁', ox + (goal % cols) * c + c / 2, oy + Math.floor(goal / cols) * c + c / 2);
    ctx.textBaseline = 'alphabetic';
  }

  /** Двоичное дерево: s = { nodes: [{key, left, right}], root, hi: {индекс: цвет} } — раскладка по in-order */
  function tree(ctx, W, H, f, C, top = 18, height) {
    const { nodes, root, hi = {} } = f.s;
    if (root == null) return;
    const pos = {}, order = [];
    let depthMax = 0;
    (function walk(i, d) { if (i == null) return; walk(nodes[i].left, d + 1); order.push(i); pos[i] = { d }; depthMax = Math.max(depthMax, d); walk(nodes[i].right, d + 1); })(root, 0);
    const hgt = height || H - top - 10;
    order.forEach((idx, k) => { pos[idx].x = ((k + 0.5) / order.length) * W; pos[idx].y = top + 16 + (pos[idx].d * (hgt - 32)) / Math.max(1, depthMax); });
    ctx.strokeStyle = C.hint; ctx.lineWidth = 2;
    for (const i of order) for (const ch of [nodes[i].left, nodes[i].right]) if (ch != null) { ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[ch].x, pos[ch].y); ctx.stroke(); }
    const r = Math.min(17, W / (order.length * 2.4) + 6);
    for (const i of order) {
      ctx.fillStyle = hi[i] ? C[hi[i]] || hi[i] : C.accent;
      ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${r * 0.85}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nodes[i].key, pos[i].x, pos[i].y);
    }
    ctx.textBaseline = 'alphabetic';
  }

  /** Перемешанный массив 1..n (для сортировок) */
  function shuffled(api, n, max = 99) {
    return api.shuffle([...Array(n)].map(() => api.randi(max - 4) + 5));
  }

  window.Algo = { viz, bars, grid, tree, shuffled };
})();
