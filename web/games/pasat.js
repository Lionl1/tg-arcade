// Сумма в уме (по мотивам PASAT): удержать число и тут же сложить с новым
Arcade.register({
  howto: 'Числа появляются по одному. Выбирай сумму ДВУХ ПОСЛЕДНИХ чисел, пока не пришло следующее. Темп ускоряется. Ошибка или не успел — минус жизнь, всего 3.',
  start(api) {
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const num = api.el('div', 'learn-q big', box);
    const sub = api.el('div', 'hint', box, '');
    const ch = api.el('div', 'choices', box);
    let prev = null, cur = null, lives = 3, waiting = false, cancel = () => {};
    const interval = () => Math.max(1500, 3300 - api.score * 70);
    const hearts = () => '❤️'.repeat(Math.max(0, lives));

    function lose(msg) {
      lives--; api.haptic('error'); sub.textContent = msg;
      if (lives <= 0) { waiting = false; api.after(900, () => api.end()); return true; }
      return false;
    }
    function next() {
      if (lives <= 0) return;
      prev = cur; cur = api.randi(9) + 1;
      num.textContent = cur; num.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 150 });
      info.textContent = `Темп: ${(interval() / 1000).toFixed(1)} с · ${hearts()}`;
      ch.innerHTML = '';
      if (prev === null) { sub.textContent = 'Запомни это число'; cancel = api.after(interval(), next); return; }
      const ans = prev + cur;
      const opts = new Set([ans]);
      while (opts.size < 4) { const v = ans + api.pick([-3, -2, -1, 1, 2, 3]); if (v >= 2 && v <= 18) opts.add(v); }
      for (const v of [...opts].sort((a, b) => a - b)) api.el('button', 'btn', ch, v).dataset.v = v;
      waiting = true;
      cancel = api.after(interval(), () => {
        if (!waiting) return;
        waiting = false;
        if (!lose(`Не успел: было ${ans}`)) next();
      });
    }
    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || !waiting) return;
      waiting = false; cancel();
      if (+b.dataset.v === prev + cur) { api.addScore(1); api.haptic('light'); sub.textContent = ''; }
      else if (lose(`Было ${prev} + ${cur} = ${prev + cur}`)) return;
      api.after(250, next);
    });
    info.textContent = hearts();
    api.after(700, next);
  },
});
