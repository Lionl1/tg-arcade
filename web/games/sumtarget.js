// Собери сумму — быстрый счёт и комбинаторика
Arcade.register({
  howto: L('Выделяй числа, которые в сумме дают цель. Сколько чисел — неважно, очки = количество использованных чисел. Перебор — выделение сбросится. 60 секунд.', 'Select numbers that add up to the target. Any count works; points = how many numbers you used. Overshoot and the selection resets. 60 seconds.'),
  start(api) {
    const box = api.el('div', 'fill');
    const goal = api.el('div', 'learn-q', box);
    const now = api.el('div', 'hint', box);
    const grid = api.el('div', 'grid g4', box);
    grid.style.maxWidth = 'min(86vw, 48vh)';
    const vals = [], tiles = [];
    let target = 0, picked = new Set();
    api.timer(60);

    const roll = (i) => { vals[i] = api.randi(9) + 1; tiles[i].textContent = vals[i]; };
    for (let i = 0; i < 16; i++) { tiles.push(api.el('button', 'tile', grid)); tiles[i].dataset.i = i; roll(i); }

    function newTarget() {
      const k = 2 + api.randi(Math.min(3, 1 + Math.floor(api.score / 8)));
      target = api.shuffle([...vals.keys()]).slice(0, k).reduce((s, i) => s + vals[i], 0);
      goal.textContent = L(`Цель: ${target}`, `Target: ${target}`);
    }
    function draw() {
      const sum = [...picked].reduce((s, i) => s + vals[i], 0);
      now.textContent = L(`Сумма: ${sum}`, `Sum: ${sum}`);
      tiles.forEach((t, i) => { t.style.background = picked.has(i) ? 'var(--accent)' : ''; t.style.color = picked.has(i) ? 'var(--accent-fg)' : ''; });
      return sum;
    }
    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const i = +t.dataset.i;
      if (picked.has(i)) picked.delete(i); else picked.add(i);
      api.haptic('select');
      const sum = draw();
      if (sum === target) {
        api.addScore(picked.size); api.haptic('success'); api.tone(880, 70);
        for (const j of picked) roll(j);
        picked = new Set(); newTarget(); draw();
      } else if (sum > target) {
        api.haptic('error'); api.shake(grid);
        picked = new Set(); draw();
      }
    });
    newTarget(); draw();
  },
});
