// Японский кроссворд: восстанови картинку по числам. Генератор рисует случайную картинку и считает подсказки.
Arcade.register({
  howto: L('Числа у строки/столбца — длины закрашенных отрезков по порядку (между ними хотя бы одна пустая клетка). Тап закрашивает клетку; в режиме ✖ ставишь пометку «точно пусто». Решено, когда все числа совпали. Поле растёт. 5 минут.', 'The numbers by each row/column are the lengths of filled runs, in order (with at least one empty cell between them). A tap fills a cell; in ✖ mode you mark “definitely empty”. Solved when all numbers match. The grid grows. 5 minutes.'),
  start(api) {
    const box = api.el('div', 'fill');
    box.style.gap = '10px';
    const info = api.el('div', 'hint', box);
    const wrap = api.el('div', '', box);
    const row = api.el('div', 'row', box);
    row.style.cssText = 'width:min(90vw,360px)';
    const modeBtn = api.el('button', 'btn', row, L('✏️ Закрашивать', '✏️ Fill'));
    api.timer(300);
    let n = Math.min(10, 5 + Math.floor((api.level || 0) / 4)), sol, cur, rows, cols, mark = false, solved = 0;

    const clue = (line) => { const out = []; let run = 0; for (const v of line) { if (v === 1) run++; else if (run) { out.push(run); run = 0; } } if (run) out.push(run); return out.length ? out : [0]; };
    const rowOf = (g, r) => g.slice(r * n, r * n + n).map((v) => (v === 1 ? 1 : 0));
    const colOf = (g, c) => [...Array(n)].map((_, r) => (g[r * n + c] === 1 ? 1 : 0));

    function fresh() {
      do sol = [...Array(n * n)].map(() => (api.rand() < 0.58 ? 1 : 0));
      while ([...Array(n).keys()].some((i) => !rowOf(sol, i).includes(1) || !colOf(sol, i).includes(1)));
      rows = [...Array(n)].map((_, r) => clue(rowOf(sol, r)));
      cols = [...Array(n)].map((_, c) => clue(colOf(sol, c)));
      cur = Array(n * n).fill(0); // 0 пусто, 1 закрашено, 2 пометка
      draw();
    }
    function draw() {
      info.textContent = L(`Поле ${n}×${n} · решено: ${solved}`, `Grid ${n}×${n} · solved: ${solved}`);
      const maxR = Math.max(...rows.map((r) => r.length)), maxC = Math.max(...cols.map((c) => c.length));
      const size = Math.floor(Math.min(window.innerWidth * 0.92, window.innerHeight * 0.55) / (n + Math.max(maxR, maxC) * 0.6));
      const fs = Math.max(9, Math.floor(size * 0.42));
      wrap.innerHTML = '';
      wrap.style.cssText = `display:grid;grid-template-columns:auto repeat(${n},${size}px);gap:2px;align-items:end`;
      api.el('div', '', wrap);
      cols.forEach((c, j) => {
        const d = api.el('div', '', wrap);
        const ok = clue(colOf(cur, j)).join() === c.join();
        d.style.cssText = `font-size:${fs}px;line-height:1.1;text-align:center;color:${ok ? 'var(--good)' : 'var(--hint)'};font-weight:700`;
        d.innerHTML = c.join('<br>');
      });
      for (let r = 0; r < n; r++) {
        const d = api.el('div', '', wrap);
        const ok = clue(rowOf(cur, r)).join() === rows[r].join();
        d.style.cssText = `font-size:${fs}px;padding-right:6px;text-align:right;white-space:nowrap;align-self:center;color:${ok ? 'var(--good)' : 'var(--hint)'};font-weight:700`;
        d.textContent = rows[r].join(' ');
        for (let c = 0; c < n; c++) {
          const i = r * n + c, t = api.el('button', '', wrap);
          t.dataset.i = i;
          t.style.cssText = `width:${size}px;height:${size}px;border:0;border-radius:3px;font-size:${fs}px;color:var(--hint);
            background:${cur[i] === 1 ? 'var(--fg)' : 'var(--card)'};${c % 5 === 4 && c < n - 1 ? 'margin-right:2px;' : ''}${r % 5 === 4 && r < n - 1 ? 'margin-bottom:2px;' : ''}`;
          t.textContent = cur[i] === 2 ? '✖' : '';
        }
      }
    }
    api.on(wrap, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const i = +t.dataset.i, want = mark ? 2 : 1;
      cur[i] = cur[i] === want ? 0 : want;
      api.haptic('select'); draw();
      const done = [...Array(n).keys()].every((k) => clue(rowOf(cur, k)).join() === rows[k].join() && clue(colOf(cur, k)).join() === cols[k].join());
      if (done) {
        solved++; api.addScore(n * n); api.haptic('success'); api.tone(990, 140);
        n = Math.min(12, n + 1);
        api.after(700, fresh);
      }
    });
    api.on(modeBtn, 'click', () => { mark = !mark; modeBtn.textContent = mark ? L('✖ Помечать пустые', '✖ Mark empty') : L('✏️ Закрашивать', '✏️ Fill'); modeBtn.className = mark ? 'btn ghost' : 'btn'; });
    fresh();
  },
});
