// Мини-судоку 6×6 (блоки 2×3), всегда с единственным решением
Arcade.register({
  tiers: true, // в личной игре подсказок меньше: 16 → 12 → 11 → 10
  howto: L('Заполни поле цифрами 1–6: в каждой строке, столбце и блоке 2×3 — без повторов. Выбери клетку, потом цифру. Конфликты подсвечиваются красным. Решение всегда одно.', 'Fill the grid with digits 1–6: no repeats in any row, column or 2×3 box. Pick a cell, then a digit. Conflicts turn red. There is always exactly one solution.'),
  start(api) {
    const N = 6, BR = 2, BC = 3;
    // базовое решение + перестановки, сохраняющие правила
    let sol = [...Array(N)].map((_, r) => [...Array(N)].map((_, c) => (BC * (r % BR) + Math.floor(r / BR) + c) % N));
    const digits = api.shuffle([1, 2, 3, 4, 5, 6]);
    const rows = api.shuffle([0, 1, 2]).flatMap((b) => api.shuffle([0, 1]).map((i) => b * BR + i));
    const cols = api.shuffle([0, 1]).flatMap((s) => api.shuffle([0, 1, 2]).map((i) => s * BC + i));
    const flat = rows.flatMap((r) => cols.map((c) => digits[sol[r][c]]));

    const ok = (g, r, c, v) => {
      for (let k = 0; k < N; k++) if (g[r * N + k] === v || g[k * N + c] === v) return false;
      const br = r - (r % BR), bc = c - (c % BC);
      for (let y = br; y < br + BR; y++) for (let x = bc; x < bc + BC; x++) if (g[y * N + x] === v) return false;
      return true;
    };
    const count = (g, limit = 2) => {
      const i = g.indexOf(0);
      if (i < 0) return 1;
      let n = 0;
      for (let v = 1; v <= N && n < limit; v++) {
        if (ok(g, (i / N) | 0, i % N, v)) { g[i] = v; n += count(g, limit); g[i] = 0; }
      }
      return n;
    };
    const puzzle = flat.slice();
    let givens = N * N;
    for (const i of api.shuffle([...Array(N * N).keys()])) {
      if (givens <= [16, 12, 11, 10][api.tier - 1]) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (count(puzzle.slice()) !== 1) puzzle[i] = keep; else givens--;
    }

    const box = api.el('div', 'fill');
    const grid = api.el('div', 'grid', box);
    grid.style.cssText += ';grid-template-columns:repeat(6,1fr);gap:3px;max-width:min(92vw,50vh)';
    const cur = puzzle.slice();
    const cells = puzzle.map((v, i) => {
      const t = api.el('button', 'tile', grid, v || '');
      const r = (i / N) | 0, c = i % N;
      t.style.cssText = `font-size:min(6.5vw,28px);border-radius:6px;${c === 2 ? 'margin-right:5px;' : ''}${r === 1 || r === 3 ? 'margin-bottom:5px;' : ''}`;
      if (v) { t.dataset.given = '1'; t.style.background = 'color-mix(in srgb, var(--fg) 14%, var(--card))'; }
      else t.style.color = 'var(--accent)';
      t.dataset.i = i;
      return t;
    });
    const pad = api.el('div', 'grid', box);
    pad.style.cssText += ';grid-template-columns:repeat(7,1fr);gap:6px;max-width:min(92vw,50vh)';
    for (const k of ['1', '2', '3', '4', '5', '6', '⌫']) { const b = api.el('button', 'tile', pad, k); b.dataset.k = k; b.style.fontSize = '22px'; }
    let sel = -1;
    const t0 = performance.now();

    function paint() {
      cells.forEach((t, i) => {
        t.style.outline = i === sel ? '3px solid var(--accent)' : '';
        if (t.dataset.given) return;
        const v = cur[i];
        if (!v) { t.style.color = 'var(--accent)'; return; }
        cur[i] = 0;
        const bad = !ok(cur, (i / N) | 0, i % N, v);
        cur[i] = v;
        t.style.color = bad ? 'var(--bad)' : 'var(--accent)';
      });
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t || t.dataset.given) return;
      sel = +t.dataset.i; api.haptic('select'); paint();
    });
    api.on(pad, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || sel < 0) return;
      cur[sel] = b.dataset.k === '⌫' ? 0 : +b.dataset.k;
      cells[sel].textContent = cur[sel] || '';
      api.haptic('light'); paint();
      if (cur.every((v, i) => v === flat[i])) { api.haptic('success'); api.after(300, () => api.end(Math.round(performance.now() - t0))); }
    });
    api.loop(() => api.setScore(Math.round(performance.now() - t0)));
  },
});
