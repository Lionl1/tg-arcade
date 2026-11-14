Arcade.register({
  tiers: true, // в личной игре: поле 4×4 → 5×5 → 6×6 → 7×7
  howto: L('Нажимай числа по порядку как можно быстрее (в личной игре поле растёт с успехами). Ошибка — штраф 1 секунда.', 'Tap the numbers in order as fast as you can (in personal play the grid grows as you succeed). A mistake costs 1 second.'),
  start(api) {
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box, L('Найди: 1', 'Find: 1'));
    const S = [4, 5, 6, 7][api.tier - 1], TOTAL = S * S;
    const grid = api.el('div', 'grid', box);
    grid.style.gridTemplateColumns = `repeat(${S}, 1fr)`;
    api.shuffle([...Array(TOTAL)].map((_, i) => i + 1)).forEach((n) => {
      const t = api.el('button', 'tile', grid, n);
      t.style.fontSize = 'min(7vw,30px)';
      t.dataset.n = n;
    });
    let next = 1, penalty = 0;
    const t0 = performance.now();
    const elapsed = () => Math.round(performance.now() - t0 + penalty);

    api.on(grid, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t || t.dataset.done) return;
      if (+t.dataset.n === next) {
        t.dataset.done = '1'; t.style.opacity = '.3'; api.haptic('select');
        if (++next > TOTAL) return api.end(elapsed());
        info.textContent = L('Найди: ', 'Find: ') + next;
      } else {
        penalty += 1000; api.haptic('error');
        t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
      }
    });
    api.loop(() => api.setScore(elapsed()));
  },
});
