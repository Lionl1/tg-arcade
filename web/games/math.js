Arcade.register({
  howto: L('Выбирай правильный ответ. Примеры усложняются. Ошибка — минус 3 секунды. Всего 30 секунд.', 'Pick the right answer. The sums get harder. A mistake costs 3 seconds. 30 seconds in total.'),
  chapters: {
    2: L('с первого примера — умножение и деление', 'multiplication and division from the first sum'),
    3: L('примеры из трёх чисел', 'three-number expressions'),
    4: L('скобки и порядок действий', 'brackets and order of operations'),
  },
  start(api) {
    const ch = api.chapter;
    const box = api.el('div', 'fill');
    const q = api.el('div', '', box);
    q.style.cssText = 'font-size:44px;font-weight:800;font-variant-numeric:tabular-nums';
    const chBox = api.el('div', 'choices', box);
    const tm = api.timer(30);
    let ans = 0;

    function gen() {
      const lvl = api.score + (ch >= 2 ? 4 : 0), m = 10 + lvl * 3;
      if (ch >= 3 && api.rand() < (ch >= 4 ? 0.6 : 0.4)) return gen3();
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
      chBox.innerHTML = '';
      for (const v of api.shuffle([...opts])) { const b = api.el('button', 'btn', chBox, v); b.dataset.v = v; }
    }

    function gen3() { // три числа; в главе 4 — со скобками
      const a = api.randi(9) + 2, b = api.randi(9) + 2, c = api.randi(9) + 2;
      const forms = [[`${a} + ${b} × ${c}`, a + b * c], [`${a} × ${b} − ${c}`, a * b - c], [`${a} + ${b} − ${c}`, a + b - c]];
      if (ch >= 4) forms.push([`(${a} + ${b}) × ${c}`, (a + b) * c], [`${a} × (${b} + ${c})`, a * (b + c)], [`${a * b} ÷ ${a} + ${c}`, b + c]);
      const [text, v] = api.pick(forms);
      ans = v; q.textContent = text;
      const opts = new Set([ans]);
      const trap = text.includes('×') ? [(a + b) * c, a * b + c, a + b + c] : [a + b + c];
      for (const t2 of trap) if (opts.size < 4 && t2 >= 0) opts.add(t2);
      while (opts.size < 4) { const d = (api.randi(Math.max(3, Math.ceil(ans * 0.15))) + 1) * (api.rand() < 0.5 ? -1 : 1); if (ans + d >= 0) opts.add(ans + d); }
      chBox.innerHTML = '';
      for (const val of api.shuffle([...opts])) { const btn = api.el('button', 'btn', chBox, val); btn.dataset.v = val; }
    }

    api.on(chBox, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (+b.dataset.v === ans) { api.addScore(1); api.haptic('light'); }
      else { api.haptic('error'); tm.add(-3); q.classList.remove('shake'); void q.offsetWidth; q.classList.add('shake'); }
      gen();
    });
    gen();
  },
});
