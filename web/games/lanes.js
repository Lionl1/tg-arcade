// Три дорожки: свайп влево/вправо — смена полосы, вверх — прыжок через низкий барьер
Arcade.register({
  howto: L('Свайп ←/→ меняет дорожку, свайп ↑ (или пробел) — прыжок через низкий оранжевый барьер. Красные стены только объезжать. Монетки +5. Скорость растёт.', 'Swipe ←/→ to change lanes, swipe ↑ (or space) to jump the low orange barrier. Red walls can only be avoided. Coins +5. The speed grows.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    let lane = 1, px = 0, jump = 0, dist = 0, coins = 0, obs = [], next = 0.6, dead = false;
    const laneX = (i) => g.W * (0.2 + 0.3 * i);
    px = laneX(1);

    const doJump = () => { if (!dead && jump <= 0) { jump = 0.65; api.haptic('light'); } };
    api.onSwipe((d) => {
      if (dead) return;
      if (d === 'left' && lane > 0) { lane--; api.haptic('select'); }
      if (d === 'right' && lane < 2) { lane++; api.haptic('select'); }
      if (d === 'up') doJump();
    });
    api.on(window, 'keydown', (e) => { if (e.code === 'Space') doJump(); });

    function spawn(speed) {
      const r = api.rand();
      if (r < 0.45) { // одна-две стены, одна дорожка всегда свободна
        const free = api.randi(3);
        for (let i = 0; i < 3; i++) if (i !== free && (api.rand() < 0.6 || i === (free + 1) % 3)) obs.push({ lane: i, y: -40, kind: 'wall' });
      } else if (r < 0.75) {
        const l = api.randi(3);
        obs.push({ lane: l, y: -40, kind: 'low' });
        if (api.rand() < 0.4) obs.push({ lane: (l + 1 + api.randi(2)) % 3, y: -40, kind: 'low' });
      } else {
        const l = api.randi(3);
        for (let k = 0; k < 4; k++) obs.push({ lane: l, y: -40 - k * 45, kind: 'coin' });
      }
      next = Math.max(0.45, 0.95 - dist / 30000) * (300 / speed) * 1.4;
    }

    api.loop((dt) => {
      const py = g.H * 0.78;
      const speed = Math.min(720, 280 + dist / 25);
      if (!dead) {
        dist += speed * dt;
        jump = Math.max(0, jump - dt);
        px += (laneX(lane) - px) * Math.min(1, dt * 14);
        next -= dt;
        if (next <= 0) spawn(speed);
        for (const o of obs) {
          o.y += speed * dt;
          if (o.hit || o.lane !== lane || Math.abs(o.y - py) > 26) continue;
          if (o.kind === 'coin') { o.hit = true; coins++; api.tone(990, 40); continue; }
          if (o.kind === 'low' && jump > 0.12) continue;
          dead = true; api.haptic('heavy'); api.after(600, () => api.end());
        }
        obs = obs.filter((o) => o.y < g.H + 60 && !(o.kind === 'coin' && o.hit));
        api.setScore(Math.floor(dist / 40) + coins * 5);
      }
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.strokeStyle = C.card; x.lineWidth = 3; x.setLineDash([24, 18]); x.lineDashOffset = -dist % 42;
      for (const lx of [g.W * 0.35, g.W * 0.65]) { x.beginPath(); x.moveTo(lx, 0); x.lineTo(lx, g.H); x.stroke(); }
      x.setLineDash([]);
      for (const o of obs) {
        const ox = laneX(o.lane);
        if (o.kind === 'coin') { x.fillStyle = C.warn; x.beginPath(); x.arc(ox, o.y, 9, 0, 7); x.fill(); continue; }
        x.fillStyle = o.kind === 'wall' ? C.bad : '#f0883e';
        const h = o.kind === 'wall' ? 46 : 18;
        api.rr(x, ox - g.W * 0.12, o.y - h / 2, g.W * 0.24, h, 6); x.fill();
      }
      const lift = Math.sin(Math.min(1, (0.65 - jump) / 0.65) * Math.PI) * (jump > 0 ? 26 : 0);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(px, py + 16, 16, 6, 0, 0, 7); x.fill();
      x.fillStyle = dead ? C.hint : C.accent; x.beginPath(); x.arc(px, py - lift, 16 + lift * 0.15, 0, 7); x.fill();
    });
  },
});
