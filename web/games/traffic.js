// Трасса: перестраивайся между полосами и обгоняй поток
Arcade.register({
  howto: 'Тап по левой/правой половине (или ←/→) — перестроиться. Обгоняй машины, не врезаясь. Близкий обгон — бонус +3. Скорость всё выше.',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const L = 4;
    let lane = 1, px = 0, cars = [], next = 0.5, dist = 0, bonus = 0, dead = false;
    const laneX = (i) => g.W * (0.125 + 0.25 * i);
    px = laneX(lane);
    const move = (d) => { if (!dead) { lane = api.clamp(lane + d, 0, L - 1); api.haptic('select'); } };
    api.onTap((tx) => move(tx < api.W / 2 ? -1 : 1));
    api.on(window, 'keydown', (e) => { if (e.code === 'ArrowLeft') move(-1); if (e.code === 'ArrowRight') move(1); });

    function car(cx, cy, color, w, h) {
      x.fillStyle = color; api.rr(x, cx - w / 2, cy - h / 2, w, h, 8); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; api.rr(x, cx - w / 2 + 5, cy - h / 2 + 10, w - 10, h * 0.22, 4); x.fill();
    }
    api.loop((dt) => {
      const py = g.H * 0.82, cw = g.W * 0.16, ch = cw * 1.8;
      const speed = Math.min(800, 300 + dist / 22);
      if (!dead) {
        dist += speed * dt;
        px += (laneX(lane) - px) * Math.min(1, dt * 12);
        next -= dt;
        if (next <= 0) {
          const free = api.randi(L);
          const n = 1 + (dist > 4000 ? api.randi(2) : 0) + (dist > 12000 ? 1 : 0);
          const lanes = api.shuffle([...Array(L).keys()].filter((i) => i !== free)).slice(0, Math.min(n, L - 1));
          for (const l of lanes) cars.push({ lane: l, y: -ch, v: api.rand(0.35, 0.6), color: api.pick(C.palette) });
          next = Math.max(0.42, 0.95 - dist / 30000);
        }
        for (const c of cars) {
          c.y += speed * c.v * dt;
          const dx = Math.abs(laneX(c.lane) - px), dy = Math.abs(c.y - py);
          if (dx < cw * 0.9 && dy < ch * 0.9) { dead = true; api.haptic('heavy'); api.after(600, () => api.end()); }
          if (!c.passed && c.y > py + ch) {
            c.passed = true;
            if (Math.abs(c.lane - lane) === 1 && dx < cw * 1.6) { bonus += 3; api.tone(1100, 40); }
          }
        }
        cars = cars.filter((c) => c.y < g.H + ch);
        api.setScore(Math.floor(dist / 50) + bonus);
      }
      x.fillStyle = '#2b2f36'; x.fillRect(0, 0, g.W, g.H);
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; x.setLineDash([26, 22]); x.lineDashOffset = -dist % 48;
      for (let i = 1; i < L; i++) { x.beginPath(); x.moveTo(g.W * 0.25 * i, 0); x.lineTo(g.W * 0.25 * i, g.H); x.stroke(); }
      x.setLineDash([]);
      for (const c of cars) car(laneX(c.lane), c.y, c.color, cw, ch);
      car(px, py, dead ? C.hint : C.accent, cw, ch);
    });
  },
});
