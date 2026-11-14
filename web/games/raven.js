// Матрицы в духе тестов на логическое мышление: найди закономерность в таблице 3×3
Arcade.register({
  howto: L('В каждой строке фигуры меняются по правилу: форма, цвет, количество. Найди, что должно стоять вместо «?». С ростом счёта меняется больше признаков сразу. Ошибка −5 с. 90 секунд.', 'In each row the shapes change by a rule: shape, colour, count. Find what belongs in place of “?”. As your score grows, more features change at once. A mistake costs 5 s. 90 seconds.'),
  start(api) {
    const SHAPES = ['●', '▲', '■', '◆'];
    const COLORS = ['#e5534b', '#3fb950', '#4a90e2', '#e3b341'];
    const box = api.el('div', 'fill');
    box.style.gap = '12px';
    const grid = api.el('div', 'grid g3', box);
    grid.style.maxWidth = 'min(80vw, 40vh)';
    api.el('div', 'hint', box, L('Что вместо «?»', 'What replaces “?”'));
    const opts = api.el('div', 'grid g4', box);
    opts.style.maxWidth = 'min(92vw, 46vh)';
    const tm = api.timer(90);
    let answerKey = '';

    const keyOf = (f) => `${f.shape}|${f.color}|${f.count}`;
    function figure(el, f) {
      el.innerHTML = '';
      const s = document.createElement('span');
      s.textContent = SHAPES[f.shape].repeat(f.count);
      s.style.cssText = `color:${COLORS[f.color]};font-size:${f.count === 3 ? 'min(5vw,22px)' : 'min(7vw,30px)'};letter-spacing:1px;white-space:nowrap`;
      el.appendChild(s);
    }
    function rule(varies, values, isCount) {
      // values — 3 разных значения признака
      if (!varies) { const v = values[0]; return () => v; }
      if (isCount && api.rand() < 0.4) return (r, c) => c + 1; // прогрессия 1-2-3
      const sh = api.pick([1, 2]);
      return (r, c) => values[(c + r * sh) % 3];
    }
    function next() {
      const lvl = api.score;
      const nVary = lvl < 3 ? 1 : lvl < 8 ? 2 : 3;
      const vary = new Set(api.shuffle(['shape', 'color', 'count']).slice(0, nVary));
      const fShape = rule(vary.has('shape'), api.shuffle([0, 1, 2, 3]).slice(0, 3));
      const fColor = rule(vary.has('color'), api.shuffle([0, 1, 2, 3]).slice(0, 3));
      const fCount = rule(vary.has('count'), api.shuffle([1, 2, 3]), true);
      const cell = (r, c) => ({ shape: fShape(r, c), color: fColor(r, c), count: fCount(r, c) });

      grid.innerHTML = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const t = api.el('div', 'tile', grid);
        if (r === 2 && c === 2) { t.textContent = '?'; t.style.color = 'var(--hint)'; } else figure(t, cell(r, c));
      }
      const ans = cell(2, 2);
      answerKey = keyOf(ans);
      // неверные варианты: меняем по одному признаку
      const variants = [];
      for (let s = 0; s < 4; s++) if (s !== ans.shape) variants.push({ ...ans, shape: s });
      for (let c = 0; c < 4; c++) if (c !== ans.color) variants.push({ ...ans, color: c });
      for (let n = 1; n <= 3; n++) if (n !== ans.count) variants.push({ ...ans, count: n });
      // приоритет — подмены по меняющимся признакам (они правдоподобнее)
      const plausible = api.shuffle(variants).sort((x, y) => {
        const w = (v) => (vary.has(v.shape !== ans.shape ? 'shape' : v.color !== ans.color ? 'color' : 'count') ? 0 : 1);
        return w(x) - w(y);
      });
      const shown = [ans, ...plausible.slice(0, 3)];
      opts.innerHTML = '';
      for (const f of api.shuffle(shown)) {
        const t = api.el('button', 'tile', opts);
        figure(t, f);
        t.dataset.k = keyOf(f);
      }
    }
    api.on(opts, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.k === answerKey) { api.addScore(1); api.haptic('success'); api.tone(900, 70); }
      else { tm.add(-5); api.haptic('error'); api.shake(grid); }
      next();
    });
    next();
  },
});
