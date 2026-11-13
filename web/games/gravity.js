// Гравитация: бежишь по полу или потолку, тап переворачивает притяжение
Arcade.register({
  howto: 'Тап (или пробел) переворачивает гравитацию: бежишь то по полу, то по потолку. Шипы растут и снизу, и сверху — успевай переключаться.',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const s = 22;
    let side = 1, y = 0, vy = 0, dist = 0, obs = [], next = 1, dead = false;
    const floor = () => g.H * 0.72, ceil = () => g.H * 0.28;
    y = floor() - s;
    api.onAction(() => { if (!dead) { side = -side; api.haptic('select'); } });

    api.loop((dt) => {
      const F = floor(), Cc = ceil(), px = g.W * 0.25;
      const speed = Math.min(640, 260 + dist / 28);
      if (!dead) {
        dist += speed * dt;
        vy += side * 2600 * dt;
        y += vy * dt;
        if (y > F - s) { y = F - s; vy = 0; }
        if (y < Cc) { y = Cc; vy = 0; }
        next -= dt;
        if (next <= 0) {
          const where = api.rand() < 0.5 ? 1 : -1;
          obs.push({ x: g.W + 10, w: api.rand(26, 70), side: where });
          if (dist > 3000 && api.rand() < 0.3) obs.push({ x: g.W + 10 + api.rand(160, 260), w: api.rand(26, 50), side: -where });
          next = Math.max(0.5, 1.15 - dist / 30000);
        }
        for (const o of obs) {
          o.x -= speed * dt;
          const sy = o.side === 1 ? F - 22 : Cc;
          if (px + s - 4 > o.x && px + 4 < o.x + o.w && y + s > sy && y < sy + 22) {
            dead = true; api.haptic('heavy'); api.after(600, () => api.end());
          }
        }
        obs = obs.filter((o) => o.x + o.w > -10);
        api.setScore(Math.floor(dist / 40));
      }
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(0, F, g.W, g.H - F); x.fillRect(0, 0, g.W, Cc);
      x.fillStyle = C.bad;
      for (const o of obs) {
        const n = Math.max(1, Math.round(o.w / 14)), w = o.w / n;
        for (let i = 0; i < n; i++) {
          x.beginPath();
          if (o.side === 1) { x.moveTo(o.x + i * w, F); x.lineTo(o.x + i * w + w / 2, F - 22); x.lineTo(o.x + (i + 1) * w, F); }
          else { x.moveTo(o.x + i * w, Cc); x.lineTo(o.x + i * w + w / 2, Cc + 22); x.lineTo(o.x + (i + 1) * w, Cc); }
          x.fill();
        }
      }
      x.fillStyle = dead ? C.hint : C.accent; api.rr(x, px, y, s, s, 6); x.fill();
      x.fillStyle = C.bg; x.fillRect(px + s - 8, y + (side === 1 ? 6 : s - 10), 4, 4);
    });
  },
});
