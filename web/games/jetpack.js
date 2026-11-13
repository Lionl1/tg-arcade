// Ранец: держи палец — летишь вверх, отпустил — падаешь. Облетай лазеры.
Arcade.register({
  howto: 'Держи палец на экране (или пробел) — ранец тянет вверх, отпусти — падаешь. Облетай красные лазеры, собирай монеты (+5).',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const r = 13;
    let y = g.H / 2, vy = 0, hold = false, dist = 0, coins = 0, obs = [], next = 1, dead = false, t = 0;
    api.on(api.stage, 'pointerdown', () => { hold = true; });
    api.on(window, 'pointerup', () => { hold = false; });
    api.on(window, 'keydown', (e) => { if (e.code === 'Space') { hold = true; e.preventDefault(); } });
    api.on(window, 'keyup', (e) => { if (e.code === 'Space') hold = false; });

    api.loop((dt) => {
      t += dt;
      const px = g.W * 0.25, top = 30, bot = g.H - 30;
      const speed = Math.min(620, 230 + dist / 30);
      if (!dead) {
        dist += speed * dt;
        vy += (hold ? -1700 : 1300) * dt;
        vy = api.clamp(vy, -520, 620);
        y += vy * dt;
        if (y < top + r) { y = top + r; vy = 0; }
        if (y > bot - r) { y = bot - r; vy = 0; }
        next -= dt;
        if (next <= 0) {
          if (api.rand() < 0.75) {
            const len = api.rand(80, Math.min(260, g.H * 0.45));
            const yy = api.rand(top, bot - len);
            obs.push({ x: g.W + 20, y1: yy, y2: yy + len, kind: 'laser', w: 14 });
          } else {
            const yy = api.rand(top + 40, bot - 40);
            for (let k = 0; k < 5; k++) obs.push({ x: g.W + 20 + k * 34, y1: yy + Math.sin(k) * 30, kind: 'coin' });
          }
          next = Math.max(0.55, 1.2 - dist / 25000);
        }
        for (const o of obs) {
          o.x -= speed * dt;
          if (o.kind === 'coin') {
            if (!o.hit && Math.hypot(o.x - px, o.y1 - y) < r + 9) { o.hit = true; coins++; api.tone(990, 40); }
          } else if (px + r > o.x - o.w / 2 && px - r < o.x + o.w / 2 && y + r > o.y1 && y - r < o.y2) {
            dead = true; api.haptic('heavy'); api.after(600, () => api.end());
          }
        }
        obs = obs.filter((o) => o.x > -40 && !o.hit);
        api.setScore(Math.floor(dist / 40) + coins * 5);
      } else { vy += 1300 * dt; y = Math.min(bot - r, y + vy * dt); }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(0, 0, g.W, top); x.fillRect(0, bot, g.W, g.H - bot);
      for (const o of obs) {
        if (o.kind === 'coin') { x.fillStyle = C.warn; x.beginPath(); x.arc(o.x, o.y1, 8, 0, 7); x.fill(); continue; }
        x.fillStyle = C.hint; x.beginPath(); x.arc(o.x, o.y1, 8, 0, 7); x.arc(o.x, o.y2, 8, 0, 7); x.fill();
        x.strokeStyle = C.bad; x.lineWidth = 6 + Math.sin(t * 30) * 2;
        x.beginPath(); x.moveTo(o.x, o.y1); x.lineTo(o.x, o.y2); x.stroke();
      }
      if (hold && !dead) { // пламя ранца
        x.fillStyle = '#f0883e'; x.beginPath(); x.moveTo(px - 8, y + r); x.lineTo(px - 2, y + r + 14 + Math.abs(Math.sin(t * 47)) * 10); x.lineTo(px + 4, y + r); x.fill();
      }
      x.fillStyle = dead ? C.hint : C.accent; x.beginPath(); x.arc(px, y, r, 0, 7); x.fill();
      x.fillStyle = C.fg; x.fillRect(px - r - 6, y - 8, 7, 16);
    });
  },
});
