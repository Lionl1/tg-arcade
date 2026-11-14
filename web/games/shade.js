Arcade.register({
  howto: L('Один квадрат чуть светлее остальных — найди его. Поле растёт, разница тает. Ошибка — минус 3 секунды. 30 секунд.', 'One square is slightly lighter than the rest — find it. The grid grows and the difference fades. A mistake costs 3 seconds. 30 seconds.'),
  start(api) {
    const box = api.el('div', 'fill');
    const grid = api.el('div', 'grid', box);
    grid.style.gap = '6px';
    const tm = api.timer(30);
    let odd = 0;

    function next() {
      const lvl = api.score;
      const n = Math.min(8, 2 + Math.floor(lvl / 2));
      const delta = Math.max(3, 22 - lvl * 1.2);
      const h = api.randi(360), s = api.randi(30) + 50, l = api.randi(20) + 35;
      odd = api.randi(n * n);
      grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      grid.innerHTML = '';
      for (let i = 0; i < n * n; i++) {
        const t = api.el('button', 'tile', grid);
        t.style.background = `hsl(${h} ${s}% ${i === odd ? l + delta : l}%)`;
        t.style.borderRadius = '10px';
        t.dataset.i = i;
      }
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (+t.dataset.i === odd) { api.addScore(1); api.haptic('light'); next(); }
      else { tm.add(-3); api.haptic('error'); api.shake(grid); }
    });
    next();
  },
});
