Arcade.register({
  howto: 'Тапни пример, который даёт БОЛЬШЕ. Ошибка — минус 3 секунды. 30 секунд.',
  start(api) {
    const box = api.el('div', 'fill');
    const q = api.el('div', 'hint', box, 'Что больше?');
    const ch = api.el('div', 'choices', box);
    ch.style.gridTemplateColumns = '1fr';
    const btns = [0, 1].map((i) => {
      const b = api.el('button', 'btn ghost', ch);
      b.style.cssText = 'font-size:32px;padding:28px 8px;font-variant-numeric:tabular-nums';
      b.dataset.i = i;
      return b;
    });
    const tm = api.timer(30);
    let vals = [0, 0];

    function expr() {
      const m = 8 + api.score * 2;
      const op = api.pick(api.score < 3 ? ['+', '−'] : ['+', '−', '×']);
      if (op === '×') { const a = api.randi(Math.min(12, 4 + api.score / 3)) + 2, b = api.randi(9) + 2; return [`${a} × ${b}`, a * b]; }
      const a = api.randi(m) + 2, b = api.randi(m) + 1;
      return op === '+' ? [`${a} + ${b}`, a + b] : [`${a + b} − ${b}`, a];
    }
    function next() {
      const left = expr();
      let right, n = 0;
      do right = expr(); while ((right[1] === left[1] || Math.abs(right[1] - left[1]) > Math.max(4, left[1] * 0.3)) && ++n < 60);
      if (right[1] === left[1]) right = [`${right[0]} + 1`, right[1] + 1];
      [left, right].forEach((e, i) => { btns[i].textContent = e[0]; vals[i] = e[1]; });
    }
    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const i = +b.dataset.i;
      if (vals[i] > vals[1 - i]) { api.addScore(1); api.haptic('light'); }
      else { tm.add(-3); api.haptic('error'); api.shake(q); }
      next();
    });
    next();
  },
});
