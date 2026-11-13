Arcade.register({
  howto: 'Выбирай правильный ответ. Примеры усложняются. Ошибка — минус 3 секунды. Всего 30 секунд.',
  start(api) {
    const box = api.el('div', 'fill');
    const q = api.el('div', '', box);
    q.style.cssText = 'font-size:44px;font-weight:800;font-variant-numeric:tabular-nums';
    const ch = api.el('div', 'choices', box);
    const tm = api.timer(30);
    let ans = 0;

    function gen() {
      const lvl = api.score, m = 10 + lvl * 3;
      const op = api.pick(lvl < 4 ? ['+', '−'] : ['+', '−', '×', '÷']);
      let a, b;
      if (op === '+') { a = api.randi(m) + 1; b = api.randi(m) + 1; ans = a + b; }
      else if (op === '−') { a = api.randi(m) + 2; b = api.randi(a - 1) + 1; ans = a - b; }
      else if (op === '×') { a = api.randi(Math.min(11, 3 + (lvl >> 1))) + 2; b = api.randi(8) + 2; ans = a * b; }
      else { b = api.randi(8) + 2; ans = api.randi(10) + 1; a = b * ans; }
      q.textContent = `${a} ${op} ${b}`;
      const opts = new Set([ans]);
      while (opts.size < 4) {
        const d = (api.randi(Math.max(3, Math.ceil(ans * 0.15))) + 1) * (api.rand() < 0.5 ? -1 : 1);
        if (ans + d >= 0) opts.add(ans + d);
      }
      ch.innerHTML = '';
      for (const v of api.shuffle([...opts])) { const b = api.el('button', 'btn', ch, v); b.dataset.v = v; }
    }

    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (+b.dataset.v === ans) { api.addScore(1); api.haptic('light'); }
      else { api.haptic('error'); tm.add(-3); q.classList.remove('shake'); void q.offsetWidth; q.classList.add('shake'); }
      gen();
    });
    gen();
  },
});
