// Матрица памяти — зрительно-пространственная память
Arcade.register({
  howto: L('На миг загорятся клетки — запомни и нажми их все. С каждым уровнем клеток больше, поле растёт. Ошибка — минус жизнь, всего 3. Очки = сколько клеток удержал в памяти.', 'Some cells light up for a moment — remember them and tap them all. Each level has more cells and a bigger grid. A mistake costs a life, 3 in total. Points = how many cells you held in memory.'),
  start(api) {
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const grid = api.el('div', 'grid', box);
    grid.style.maxWidth = 'min(88vw, 54vh)';
    let k = 3, lives = 3, targets = new Set(), found = 0, input = false, tiles = [];

    function round() {
      const n = k <= 4 ? 3 : k <= 7 ? 4 : k <= 11 ? 5 : 6;
      grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      grid.innerHTML = '';
      tiles = [...Array(n * n)].map((_, i) => { const t = api.el('button', 'tile', grid); t.dataset.i = i; return t; });
      targets = new Set(api.shuffle([...tiles.keys()]).slice(0, k));
      found = 0; input = false;
      info.textContent = L(`Запоминай ${k} клеток · ${'❤️'.repeat(lives)}`, `Memorise ${k} cells · ${'❤️'.repeat(lives)}`);
      for (const i of targets) tiles[i].style.background = 'var(--accent)';
      api.after(900 + k * 130, () => {
        for (const i of targets) tiles[i].style.background = '';
        input = true; info.textContent = L(`Найди ${k} клеток · ${'❤️'.repeat(lives)}`, `Find ${k} cells · ${'❤️'.repeat(lives)}`);
      });
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t || !input || t.dataset.hit) return;
      const i = +t.dataset.i;
      t.dataset.hit = '1';
      if (targets.has(i)) {
        t.style.background = 'var(--good)'; api.haptic('select');
        if (++found === k) {
          input = false; api.setScore(k); api.haptic('success'); api.tone(990, 90);
          k++; api.after(600, round);
        }
      } else {
        input = false; lives--; api.haptic('error');
        t.style.background = 'var(--bad)';
        for (const j of targets) if (!tiles[j].dataset.hit) tiles[j].style.background = 'color-mix(in srgb, var(--accent) 45%, var(--card))';
        if (lives <= 0) return api.after(1200, () => api.end());
        api.after(1300, round);
      }
    });
    api.after(500, round);
  },
});
