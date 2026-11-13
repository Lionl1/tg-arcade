// Мысленное вращение: та же фигура повёрнута или это её зеркальное отражение?
Arcade.register({
  howto: 'Справа — левая фигура, повёрнутая на какой-то угол. Или её зеркальное отражение? Реши в уме. Фигуры усложняются. Ошибка −3 с. 60 секунд.',
  start(api) {
    const box = api.el('div', 'fill');
    api.el('div', 'hint', box, 'Та же фигура или зеркальная?');
    const row = api.el('div', '', box);
    row.style.cssText = 'display:flex;gap:14px;align-items:center;justify-content:center';
    const A = api.el('div', '', row);
    api.el('div', 'hint', row, '⟳');
    const B = api.el('div', '', row);
    const ch = api.el('div', 'choices', box);
    const same = api.el('button', 'btn', ch, '✅ Та же');
    const mir = api.el('button', 'btn ghost', ch, '🪞 Зеркальная');
    const tm = api.timer(60);
    let isMirror = false;

    const norm = (cells) => {
      const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
      return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    };
    const key = (cells) => norm(cells).map((c) => c.join(',')).join(';');
    const rot = (cells) => cells.map(([x, y]) => [y, -x]);
    const mirror = (cells) => cells.map(([x, y]) => [-x, y]);
    const rotations = (cells) => { const out = []; let r = cells; for (let i = 0; i < 4; i++) { out.push(key(r)); r = rot(r); } return out; };
    function shape(size) {
      const s = [[0, 0]];
      while (s.length < size) {
        const [x, y] = api.pick(s), [dx, dy] = api.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        if (!s.some((c) => c[0] === x + dx && c[1] === y + dy)) s.push([x + dx, y + dy]);
      }
      return norm(s);
    }
    function draw(el, cells, color) {
      const c = norm(cells);
      const w = Math.max(...c.map((p) => p[0])) + 1, h = Math.max(...c.map((p) => p[1])) + 1;
      const sz = Math.floor(Math.min(26, (Math.min(window.innerWidth * 0.36, 160)) / Math.max(w, h)));
      el.style.cssText = `display:grid;grid-template-columns:repeat(${w},${sz}px);grid-auto-rows:${sz}px;gap:2px;padding:12px;background:var(--card);border-radius:14px`;
      el.innerHTML = '';
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = document.createElement('div');
        if (c.some((p) => p[0] === x && p[1] === y)) { d.style.background = color; d.style.borderRadius = '4px'; }
        el.appendChild(d);
      }
    }
    function next() {
      const size = Math.min(9, 4 + Math.floor(api.score / 4));
      let s;
      do s = shape(size); while (rotations(s).includes(key(mirror(s)))); // симметричные фигуры не годятся
      isMirror = api.rand() < 0.5;
      let t = isMirror ? mirror(s) : s;
      for (let i = 0, k = 1 + api.randi(3); i < k; i++) t = rot(t);
      const color = api.pick(api.colors.palette);
      draw(A, s, color); draw(B, t, color);
    }
    function choose(m) {
      if (m === isMirror) { api.addScore(1); api.haptic('light'); }
      else { tm.add(-3); api.haptic('error'); api.shake(row); }
      next();
    }
    api.on(same, 'pointerdown', () => choose(false));
    api.on(mir, 'pointerdown', () => choose(true));
    next();
  },
});
