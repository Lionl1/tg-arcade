// Укладка: перетаскивай фигуры на поле 8×8, заполненные строки и столбцы исчезают
Arcade.register({
  howto: L('Перетаскивай фигуры снизу на поле. Заполнил строку или столбец целиком — они исчезают. Очки: клетки + бонус за линии (несколько сразу — больше). Конец, когда ни одна фигура не помещается.', 'Drag the pieces from below onto the board. Fill a whole row or column and it clears. Points: cells + a bonus for lines (several at once give more). The game ends when no piece fits.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const N = 8;
    const SHAPES = [
      [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
      [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    ];
    const board = Array(N * N).fill(null);
    let tray = [], drag = null, combo = 0, flash = [];

    const size = (cells) => [Math.max(...cells.map((c) => c[0])) + 1, Math.max(...cells.map((c) => c[1])) + 1];
    const fits = (cells, gx, gy) => cells.every(([cx, cy]) => {
      const X = gx + cx, Y = gy + cy;
      return X >= 0 && Y >= 0 && X < N && Y < N && !board[Y * N + X];
    });
    const fitsAnywhere = (p) => { for (let y = 0; y < N; y++) for (let X = 0; X < N; X++) if (fits(p.cells, X, y)) return true; return false; };
    // крупные фигуры чаще с ростом счёта — растёт сложность
    function piece() {
      const big = Math.min(0.5, api.score / 600);
      let s = api.pick(SHAPES);
      if (s.length <= 2 && api.rand() < big) s = api.pick(SHAPES.filter((q) => q.length >= 4));
      return { cells: s, color: api.pick(C.palette) };
    }
    function refill() { tray = [piece(), piece(), piece()]; }
    refill();

    function layout() {
      const cell = Math.floor(Math.min((g.W - 24) / N, (g.H * 0.64) / N));
      const bx = (g.W - cell * N) / 2, by = Math.max(10, (g.H - cell * N - cell * 3.4) / 2);
      return { cell, bx, by, ty: by + cell * N + cell * 0.6, tw: g.W / 3, tc: Math.floor(cell * 0.55) };
    }
    function cellAt(LT, px, py, p) {
      const [w, h] = size(p.cells);
      return [Math.round((px - LT.bx) / LT.cell - w / 2), Math.round((py - LT.cell * 1.6 - LT.by) / LT.cell - h / 2)];
    }

    api.on(api.stage, 'pointerdown', (e) => {
      const LT = layout(), { x: px, y: py } = api.pos(e);
      if (py < LT.ty - 10) return;
      const i = Math.floor(px / LT.tw);
      if (!tray[i]) return;
      drag = { i, px, py };
      api.haptic('select');
    });
    api.on(api.stage, 'pointermove', (e) => { if (drag) { const p = api.pos(e); drag.px = p.x; drag.py = p.y; } });
    api.on(window, 'pointerup', () => {
      if (!drag) return;
      const LT = layout(), p = tray[drag.i];
      const [gx, gy] = cellAt(LT, drag.px, drag.py, p);
      if (fits(p.cells, gx, gy)) place(p, gx, gy, drag.i);
      drag = null;
    });

    function place(p, gx, gy, i) {
      for (const [cx, cy] of p.cells) board[(gy + cy) * N + gx + cx] = p.color;
      tray[i] = null;
      let pts = p.cells.length;
      const full = new Set(), J = [...Array(N).keys()];
      let lines = 0;
      for (let k = 0; k < N; k++) {
        if (J.every((j) => board[k * N + j])) { lines++; J.forEach((j) => full.add(k * N + j)); }
        if (J.every((j) => board[j * N + k])) { lines++; J.forEach((j) => full.add(j * N + k)); }
      }
      if (lines) {
        combo++;
        pts += 10 * lines * lines + 5 * (combo - 1);
        for (const idx of full) { flash.push({ idx, a: 1 }); board[idx] = null; }
        api.haptic('success'); api.tone(600 + lines * 120, 120);
      } else { combo = 0; api.haptic('light'); }
      api.addScore(pts);
      if (tray.every((t) => !t)) refill();
      if (!tray.some((t) => t && fitsAnywhere(t))) api.after(600, () => api.end());
    }

    api.loop((dt) => {
      const LT = layout();
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      for (let i = 0; i < N * N; i++) {
        const X = LT.bx + (i % N) * LT.cell, Y = LT.by + Math.floor(i / N) * LT.cell;
        x.fillStyle = board[i] || C.card;
        api.rr(x, X + 1.5, Y + 1.5, LT.cell - 3, LT.cell - 3, 5); x.fill();
      }
      for (const f of flash) {
        f.a -= dt * 3;
        x.globalAlpha = Math.max(0, f.a); x.fillStyle = '#fff';
        api.rr(x, LT.bx + (f.idx % N) * LT.cell + 1.5, LT.by + Math.floor(f.idx / N) * LT.cell + 1.5, LT.cell - 3, LT.cell - 3, 5); x.fill();
      }
      x.globalAlpha = 1;
      flash = flash.filter((f) => f.a > 0);
      if (drag) { // подсказка, куда встанет фигура
        const p = tray[drag.i], [gx, gy] = cellAt(LT, drag.px, drag.py, p);
        if (fits(p.cells, gx, gy)) {
          x.globalAlpha = 0.35; x.fillStyle = p.color;
          for (const [cx, cy] of p.cells) { api.rr(x, LT.bx + (gx + cx) * LT.cell + 1.5, LT.by + (gy + cy) * LT.cell + 1.5, LT.cell - 3, LT.cell - 3, 5); x.fill(); }
          x.globalAlpha = 1;
        }
      }
      tray.forEach((p, i) => {
        if (!p) return;
        const dragging = drag && drag.i === i;
        const c = dragging ? LT.cell : LT.tc;
        const [w, h] = size(p.cells);
        const ox = dragging ? drag.px - (w * c) / 2 : LT.tw * i + (LT.tw - w * c) / 2;
        const oy = dragging ? drag.py - LT.cell * 1.6 - (h * c) / 2 : LT.ty + (LT.cell * 2.6 - h * c) / 2;
        x.globalAlpha = !dragging && !fitsAnywhere(p) ? 0.35 : 1;
        x.fillStyle = p.color;
        for (const [cx, cy] of p.cells) { api.rr(x, ox + cx * c + 1, oy + cy * c + 1, c - 2, c - 2, 4); x.fill(); }
        x.globalAlpha = 1;
      });
    });
  },
});
