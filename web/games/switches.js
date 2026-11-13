Arcade.register({
  howto: 'Нажатие переключает лампу и четырёх соседей. Погаси все лампы, чтобы пройти уровень. 90 секунд, сколько уровней успеешь?',
  start(api) {
    const N = 5;
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const grid = api.el('div', 'grid g5', box);
    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const t = api.el('button', 'tile', grid);
      t.style.fontSize = 'min(7vw,30px)';
      t.dataset.i = i; cells.push(t);
    }
    let on = [], level = 1, moves = 0, lock = false;
    api.timer(90);

    function toggle(i) {
      const r = Math.floor(i / N), c = i % N;
      for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) on[rr * N + cc] = !on[rr * N + cc];
      }
    }
    function draw() {
      cells.forEach((t, i) => {
        t.textContent = on[i] ? '💡' : '';
        t.style.background = on[i] ? 'color-mix(in srgb, var(--warn) 45%, var(--card))' : '';
      });
      info.textContent = `Уровень ${level} · ходов: ${moves}`;
    }
    function build() {
      do {
        on = Array(N * N).fill(false);
        const presses = api.shuffle([...Array(N * N).keys()]).slice(0, Math.min(14, 2 + level));
        presses.forEach(toggle);
      } while (!on.some(Boolean));
      moves = 0; lock = false; draw();
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t || lock) return;
      toggle(+t.dataset.i); moves++; api.haptic('select'); draw();
      if (!on.some(Boolean)) {
        lock = true; api.addScore(1); api.haptic('success'); api.tone(990, 120);
        info.textContent = 'Готово!'; level++;
        api.after(500, build);
      }
    });
    build();
  },
});
