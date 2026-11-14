Arcade.register({
  howto: L('Тапай (или пробел), чтобы прыгать через препятствия. В воздухе можно прыгнуть ещё раз.', 'Tap (or space) to jump over obstacles. You can jump once more in the air.'),
  chapters: {
    2: L('летучие мыши 🦇 — под ними не прыгай высоко', 'bats 🦇 — don’t jump too high under them'),
    3: L('ямы в земле — перепрыгивай', 'pits in the ground — jump over them'),
  },
  start(api) {
    const ch = api.chapter;
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
          const r = api.rand();
          if (ch >= 2 && r < 0.25) obs.push({ x: g.W, w: 30, h: 20, fly: api.rand(58, 90) }); // летит на высоте, под ней можно пробежать
          else if (ch >= 3 && r < 0.45) obs.push({ x: g.W, w: api.rand(40, 70), h: 0, pit: true });
          else { const h = api.rand(22, 52), w = api.rand(18, 36) * (api.rand() < 0.25 ? 2 : 1); obs.push({ x: g.W, w, h }); }
          next = api.rand(speed * 0.8, speed * 1.6);
        }
        for (const o of obs) {
          o.x -= speed * dt;
          const over = px + 3 < o.x + o.w && px + s - 3 > o.x;
          const hit = o.fly ? over && y < gy - o.fly + o.h && y + s > gy - o.fly
            : o.pit ? px + s / 2 > o.x + 4 && px + s / 2 < o.x + o.w - 4 && y >= gy - s - 1
            : over && y + s - 3 > gy - o.h;
          if (hit) {
            dead = true; api.haptic('heavy'); api.after(500, () => api.end());
          }
        }
        obs = obs.filter((o) => o.x + o.w > -10);
      }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(0, gy, g.W, g.H - gy);
      x.fillStyle = C.bad;
      for (const o of obs) {
        if (o.fly) { x.font = '26px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🦇', o.x + o.w / 2, gy - o.fly + o.h / 2); }
        else if (o.pit) { x.fillStyle = C.bg; x.fillRect(o.x, gy, o.w, g.H - gy); x.fillStyle = C.bad; }
        else { api.rr(x, o.x, gy - o.h, o.w, o.h, 4); x.fill(); }
      }
      x.save(); x.translate(px + s / 2, y + s / 2); x.rotate(spin);
      x.fillStyle = dead ? C.hint : C.accent; api.rr(x, -s / 2, -s / 2, s, s, 6); x.fill();
      x.restore();
    });
  },
});
