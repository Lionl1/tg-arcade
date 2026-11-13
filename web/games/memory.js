Arcade.register({
  tiers: true, // в личной игре: 6 → 8 → 10 → 12 пар
  howto: 'Открывай по две карточки и ищи пары. Чем меньше ходов, тем лучше.',
  start(api) {
    const pool = ['🍎', '🍋', '🍇', '🍉', '🥝', '🍒', '🍑', '🥥', '🍍', '🥕', '🌶️', '🍄', '🐙', '🦊', '🐸', '🦉'];
    const faces = api.shuffle(pool).slice(0, [6, 8, 10, 12][api.tier - 1]);
    const box = api.el('div', 'fill');
    const grid = api.el('div', 'grid g4', box);
    let open = [], lock = false, moves = 0, found = 0;

    for (const e of api.shuffle([...faces, ...faces])) api.el('button', 'tile', grid).dataset.e = e;
    api.setScore(0);

    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t || lock || t.dataset.open) return;
      t.dataset.open = '1'; t.textContent = t.dataset.e;
      t.style.background = 'color-mix(in srgb, var(--accent) 30%, var(--card))';
      api.haptic('select');
      open.push(t);
      if (open.length < 2) return;
      moves++; api.setScore(moves);
      const [a, b] = open; open = [];
      if (a.dataset.e === b.dataset.e) {
        a.style.opacity = b.style.opacity = '.55'; found++; api.haptic('success');
        if (found === faces.length) api.after(400, () => api.end(moves));
      } else {
        lock = true;
        api.after(650, () => {
          for (const t of [a, b]) { delete t.dataset.open; t.textContent = ''; t.style.background = ''; }
          lock = false;
        });
      }
    });
  },
});
