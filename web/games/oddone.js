Arcade.register({
  howto: 'Все картинки одинаковые, кроме одной — найди её. Поле растёт. Ошибка — минус 2 секунды. 30 секунд.',
  start(api) {
    const PAIRS = [['🍏', '🍎'], ['🔵', '🟣'], ['🌕', '🌝'], ['😺', '😸'], ['🕐', '🕑'], ['⬆️', '⬇️'], ['🐌', '🐛'],
      ['🌲', '🌳'], ['🌘', '🌒'], ['🙂', '🙃'], ['😐', '😑'], ['💙', '💜'], ['🐶', '🐺'], ['🍊', '🍑'], ['⭐', '🌟'], ['🐟', '🐠']];
    const box = api.el('div', 'fill');
    const grid = api.el('div', 'grid', box);
    const tm = api.timer(30);
    let odd = 0;

    function next() {
      const n = Math.min(7, 3 + Math.floor(api.score / 3));
      const [a, b] = api.shuffle(api.pick(PAIRS));
      odd = api.randi(n * n);
      grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      grid.innerHTML = '';
      for (let i = 0; i < n * n; i++) {
        const t = api.el('button', 'tile', grid, i === odd ? b : a);
        t.style.fontSize = `min(${Math.floor(56 / n)}vw, ${Math.floor(200 / n)}px)`;
        t.dataset.i = i;
      }
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (+t.dataset.i === odd) { api.addScore(1); api.haptic('light'); api.tone(820, 50); next(); }
      else { tm.add(-2); api.haptic('error'); api.shake(t); }
    });
    next();
  },
});
