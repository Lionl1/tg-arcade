// Фруктовые уравнения — система уравнений в картинках
Arcade.register({
  howto: L('Каждый фрукт — какое-то число. По равенствам вычисли, что спрашивают. Сначала два фрукта, потом три и умножение. Ошибка −5 с. 90 секунд.', 'Each fruit stands for a number. Use the equations to work out the answer. First two fruits, then three and multiplication. A mistake costs 5 s. 90 seconds.'),
  start(api) {
    const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍒', '🥝', '🍑', '🍍'];
    const box = api.el('div', 'fill');
    const eqs = api.el('div', '', box);
    eqs.style.cssText = 'display:flex;flex-direction:column;gap:10px;font-size:min(8vw,32px);font-weight:700;text-align:center';
    const ask = api.el('div', 'learn-q', box);
    ask.style.color = 'var(--accent)';
    const ch = api.el('div', 'choices', box);
    const tm = api.timer(90);
    let ans = 0;

    function next() {
      const lvl = api.score;
      const three = lvl >= 4, mult = lvl >= 9;
      const [A, B, C] = api.shuffle(FRUITS);
      const [a, b, c] = api.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
      const lines = [];
      const reps = api.randi(2) + 2; // A + A (+ A)
      lines.push(`${Array(reps).fill(A).join(' + ')} = ${a * reps}`);
      lines.push(`${A} + ${B} = ${a + b}`);
      let question, value;
      if (!three) {
        [question, value] = api.pick([[`${B} = ?`, b], [`${B} + ${B} = ?`, 2 * b], [`${B} − ${A} = ?`, b - a]]);
      } else {
        if (mult && api.rand() < 0.6) lines.push(`${B} × ${C} = ${b * c}`);
        else lines.push(`${B} + ${C} = ${b + c}`);
        [question, value] = api.pick([[`${C} = ?`, c], [`${A} + ${B} + ${C} = ?`, a + b + c], [`${A} × ${C} = ?`, a * c]]);
      }
      ans = value;
      eqs.innerHTML = '';
      for (const l of lines) api.el('div', '', eqs, l);
      ask.textContent = question;
      const opts = new Set([ans]);
      while (opts.size < 4) { const v = ans + api.pick([-3, -2, -1, 1, 2, 3, 4]); opts.add(v); }
      ch.innerHTML = '';
      for (const v of api.shuffle([...opts])) api.el('button', 'btn ghost', ch, v).dataset.v = v;
    }
    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (+b.dataset.v === ans) { api.addScore(1); api.haptic('light'); api.tone(820, 50); }
      else { tm.add(-5); api.haptic('error'); api.shake(eqs); }
      next();
    });
    next();
  },
});
