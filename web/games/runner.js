Arcade.register({
  howto: L('Тапай (или пробел), чтобы прыгать через препятствия. В воздухе можно прыгнуть ещё раз.', 'Tap (or space) to jump over obstacles. You can jump once more in the air.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const s = 26, px = 60;
    let gy = g.H * 0.72, y = gy - s, vy = 0, jumps = 0, obs = [], dist = 0, next = 400, dead = false, spin = 0;

    api.onAction(() => {
      if (dead || jumps >= 2) return;
      vy = jumps ? -560 : -650; jumps++;
      api.haptic('light'); api.tone(jumps === 1 ? 520 : 700, 50);
    });

    api.loop((dt) => {
      gy = g.H * 0.72;
      const speed = Math.min(620, 260 + dist / 40);
      if (!dead) {
        dist += speed * dt;
        api.setScore(Math.floor(dist / 50));
        vy += 2000 * dt; y += vy * dt;
        if (y >= gy - s) { y = gy - s; vy = 0; jumps = 0; spin = 0; } else spin += dt * 9;
        next -= speed * dt;
        if (next <= 0) {
          const h = api.rand(22, 52), w = api.rand(18, 36) * (api.rand() < 0.25 ? 2 : 1);
          obs.push({ x: g.W, w, h });
          next = api.rand(speed * 0.8, speed * 1.6);
        }
        for (const o of obs) {
          o.x -= speed * dt;
          if (px + 3 < o.x + o.w && px + s - 3 > o.x && y + s - 3 > gy - o.h) {
            dead = true; api.haptic('heavy'); api.after(500, () => api.end());
          }
        }
        obs = obs.filter((o) => o.x + o.w > -10);
      }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(0, gy, g.W, g.H - gy);
      x.fillStyle = C.bad;
      for (const o of obs) { api.rr(x, o.x, gy - o.h, o.w, o.h, 4); x.fill(); }
      x.save(); x.translate(px + s / 2, y + s / 2); x.rotate(spin);
      x.fillStyle = dead ? C.hint : C.accent; api.rr(x, -s / 2, -s / 2, s, s, 6); x.fill();
      x.restore();
    });
  },
});
