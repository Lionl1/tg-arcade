Arcade.register({
  howto: L('Тапни, чтобы опустить блок. Что свисает — отрезается. Точное попадание сохраняет ширину.', 'Tap to drop the block. Whatever overhangs is cut off. A perfect drop keeps the width.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const bh = 26;
    const stack = [{ x: g.W * 0.2, w: g.W * 0.6 }];
    let cur, speed = 170, cam = 0, falling = [], over = false;

    function spawn() {
      const top = stack[stack.length - 1];
      const fromRight = stack.length % 2 === 0;
      cur = { x: fromRight ? g.W - top.w * 0.3 : -top.w * 0.7, w: top.w, v: fromRight ? -speed : speed };
    }
    const levelY = (i) => g.H - 50 - (i + 1) * bh + cam;
    const color = (i) => `hsl(${(200 + i * 13) % 360} 65% 55%)`;
    spawn();

    api.onAction(() => {
      if (over) return;
      const top = stack[stack.length - 1];
      if (Math.abs(cur.x - top.x) < 5) {
        cur.x = top.x; api.haptic('success'); api.tone(990, 80);
      }
      const l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w);
      const lvl = stack.length;
      if (r - l <= 0) {
        falling.push({ x: cur.x, w: cur.w, y: levelY(lvl), vy: 0, i: lvl });
        over = true; api.haptic('error');
        api.after(800, () => api.end());
        return;
      }
      if (cur.x < l) falling.push({ x: cur.x, w: l - cur.x, y: levelY(lvl), vy: 0, i: lvl });
      if (cur.x + cur.w > r) falling.push({ x: r, w: cur.x + cur.w - r, y: levelY(lvl), vy: 0, i: lvl });
      stack.push({ x: l, w: r - l });
      api.addScore(1); api.haptic('light');
      speed = Math.min(420, speed + 7);
      spawn();
    });

    api.loop((dt) => {
      const want = Math.max(0, stack.length * bh - g.H * 0.5);
      cam += (want - cam) * Math.min(1, dt * 6);
      if (!over) {
        cur.x += cur.v * dt;
        if (cur.x < -cur.w * 0.7) { cur.x = -cur.w * 0.7; cur.v = Math.abs(cur.v); }
        if (cur.x > g.W - cur.w * 0.3) { cur.x = g.W - cur.w * 0.3; cur.v = -Math.abs(cur.v); }
      }
      for (const f of falling) { f.vy += 1400 * dt; f.y += f.vy * dt; }
      falling = falling.filter((f) => f.y < g.H + 100);

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      stack.forEach((b, i) => {
        const y = levelY(i);
        if (y > g.H + bh) return;
        x.fillStyle = color(i); api.rr(x, b.x, y, b.w, bh - 2, 4); x.fill();
      });
      if (!over) { x.fillStyle = color(stack.length); api.rr(x, cur.x, levelY(stack.length), cur.w, bh - 2, 4); x.fill(); }
      for (const f of falling) { x.fillStyle = color(f.i); x.globalAlpha = 0.7; api.rr(x, f.x, f.y, f.w, bh - 2, 4); x.fill(); }
      x.globalAlpha = 1;
    });
  },
});
