Arcade.register({
  howto: 'Экран станет зелёным в случайный момент — жми сразу. Нажмёшь раньше — попытка заново. Итог — среднее по 5 попыткам.',
  start(api) {
    const C = api.colors, rounds = 5, times = [];
    const box = api.el('div', 'fill');
    const big = api.el('div', '', box), small = api.el('div', 'hint', box);
    big.style.cssText = 'font-size:34px;font-weight:800';
    let state = 'wait', t0 = 0, cancel = () => {};

    function set(bg, text, sub) {
      box.style.background = bg; big.textContent = text;
      small.textContent = sub || `Попытка ${times.length + 1} из ${rounds}`;
    }
    function next() {
      state = 'wait';
      set(C.bad, 'Жди зелёного…');
      cancel = api.after(api.rand(1300, 3800), () => {
        state = 'go'; t0 = performance.now(); set(C.good, 'ЖМИ!');
      });
    }

    api.onAction(() => {
      if (state === 'wait') {
        cancel(); api.haptic('error'); state = 'pause';
        set(C.card, 'Рано! 🙅', 'Тапни, чтобы повторить');
      } else if (state === 'go') {
        const ms = Math.round(performance.now() - t0);
        times.push(ms); api.haptic('light');
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        api.setScore(avg);
        if (times.length >= rounds) return api.end(avg);
        state = 'pause';
        set(C.card, ms + ' мс', 'Тапни для следующей попытки');
      } else if (state === 'pause') next();
    });
    next();
  },
});
