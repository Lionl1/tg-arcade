Arcade.register({
  tiers: true, // в личной игре: 3×3 → 4×4 → 4×4 → 5×5
  howto: L('Двигай фишки в пустую клетку: тапни фишку в одном ряду или столбце с пустой. Собери 1–15 по порядку. Время пойдёт с первого хода.', 'Slide tiles into the empty cell: tap a tile in the same row or column as the gap. Put 1–15 in order. The clock starts with your first move.'),
  start(api) {
    const N = [3, 4, 4, 5][api.tier - 1];
    const box = api.el('div', 'fill');
    const grid = api.el('div', 'grid', box);
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    let board = [...Array(N * N - 1).keys()].map((i) => i + 1).concat(0);
    let t0 = 0;

    // перемешиваем случайными ходами — так позиция всегда решаема
    let hole = N * N - 1, prev = -1;
    for (let k = 0; k < 400; k++) {
      const r = Math.floor(hole / N), c = hole % N;
      const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .filter(([a, b]) => a >= 0 && a < N && b >= 0 && b < N).map(([a, b]) => a * N + b).filter((i) => i !== prev);
      const j = api.pick(nb);
      [board[hole], board[j]] = [board[j], board[hole]];
      prev = hole; hole = j;
    }

    const tiles = [];
    for (let i = 0; i < N * N; i++) { const t = api.el('button', 'tile', grid); t.dataset.i = i; tiles.push(t); }
    function draw() {
      board.forEach((v, i) => {
        tiles[i].textContent = v || '';
        tiles[i].style.visibility = v ? '' : 'hidden';
        tiles[i].style.background = v && v === i + 1 ? 'color-mix(in srgb, var(--good) 30%, var(--card))' : '';
      });
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const i = +t.dataset.i, h = board.indexOf(0);
      const ri = Math.floor(i / N), ci = i % N, rh = Math.floor(h / N), ch = h % N;
      if (i === h || (ri !== rh && ci !== ch)) return;
      const step = ri === rh ? (ci > ch ? 1 : -1) : (ri > rh ? N : -N);
      for (let k = h; k !== i; k += step) board[k] = board[k + step];
      board[i] = 0;
      if (!t0) t0 = performance.now();
      api.haptic('select'); draw();
      if (board.every((v, k) => v === (k + 1) % (N * N))) api.after(300, () => api.end(Math.round(performance.now() - t0)));
    });
    api.loop(() => api.setScore(t0 ? Math.round(performance.now() - t0) : null));
    draw();
  },
});
