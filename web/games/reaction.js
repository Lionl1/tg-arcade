Arcade.register({
  howto: L('Экран станет зелёным в случайный момент — жми сразу. Нажмёшь раньше — попытка заново. Итог — среднее по 5 попыткам.', 'The screen turns green at a random moment — tap right away. Tap too early and the try restarts. The result is the average of 5 tries.'),
  start(api) {
    const C = api.colors, rounds = 5, times = [];
    const box = api.el('div', 'fill');
    const big = api.el('div', '', box), small = api.el('div', 'hint', box);
    big.style.cssText = 'font-size:34px;font-weight:800';
    let state = 'wait', t0 = 0, cancel = () => {};

    function set(bg, text, sub) {
      box.style.background = bg; big.textContent = text;
      small.textContent = sub || L(`Попытка ${times.length + 1} из ${rounds}`, `Try ${times.length + 1} of ${rounds}`);
    }
    function next() {
      state = 'wait';
      set(C.bad, L('Жди зелёного…', 'Wait for green…'));
      cancel = api.after(api.rand(1300, 3800), () => {
        state = 'go'; t0 = performance.now(); set(C.good, L('ЖМИ!', 'TAP!'));
      });
    }

    api.onAction(() => {
      if (state === 'wait') {
        cancel(); api.haptic('error'); state = 'pause';
        set(C.card, L('Рано! 🙅', 'Too early! 🙅'), L('Тапни, чтобы повторить', 'Tap to retry'));
      } else if (state === 'go') {
        const ms = Math.round(performance.now() - t0);
        times.push(ms); api.haptic('light');
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        api.setScore(avg);
        if (times.length >= rounds) return api.end(avg);
        state = 'pause';
        set(C.card, ms + L(' мс', ' ms'), L('Тапни для следующей попытки', 'Tap for the next try'));
      } else if (state === 'pause') next();
    });
    next();
  },
});
