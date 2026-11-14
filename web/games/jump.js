Arcade.register({
  howto: L('Шарик прыгает сам. Веди пальцем влево-вправо (или стрелки) и забирайся как можно выше. Жёлтые платформы ломаются.', 'The ball bounces by itself. Drag left and right (or use the arrows) and climb as high as you can. Yellow platforms break.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors, keys = api.keys();
    const r = 12, G = 1500, JUMP = -760, pw = 72, ph = 10;
    let px = g.W / 2, target = px, py = g.H - 80, vy = JUMP, height = 0, plats = [];
    const gapMax = () => Math.min(150, 70 + height / 60);

    function add(y) {
      const roll = api.rand();
      const kind = height > 1500 && roll < 0.2 ? 'move' : height > 800 && roll < 0.35 ? 'break' : 'norm';
      plats.push({ x: api.rand(0, g.W - pw), y, kind, v: kind === 'move' ? api.pick([-1, 1]) * api.rand(50, 110) : 0 });
    }
    plats.push({ x: g.W / 2 - pw / 2, y: g.H - 40, kind: 'norm', v: 0 });
    for (let y = g.H - 40; y > -40;) { y -= api.rand(55, gapMax()); add(y); }

    const aim = (e) => { target = api.pos(e).x; };
    api.on(api.stage, 'pointerdown', aim);
    api.on(api.stage, 'pointermove', aim);

    api.loop((dt) => {
      const k = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      if (k) target = px + k * 40;
      target = api.clamp(target, r, g.W - r);
      px += (target - px) * Math.min(1, dt * 10);

      const prev = py;
      vy += G * dt; py += vy * dt;
      for (const p of plats) {
        if (p.kind === 'move') { p.x += p.v * dt; if (p.x < 0 || p.x > g.W - pw) p.v *= -1; }
        if (vy > 0 && prev + r <= p.y && py + r >= p.y && px > p.x - r * 0.5 && px < p.x + pw + r * 0.5) {
          py = p.y - r; vy = JUMP; api.haptic('light');
          if (p.kind === 'break') p.dead = true;
        }
      }
      if (py < g.H * 0.4) {
        const d = g.H * 0.4 - py;
        py += d; height += d;
        for (const p of plats) p.y += d;
        api.setScore(Math.floor(height / 10));
      }
      plats = plats.filter((p) => !p.dead && p.y < g.H + 20);
      let top = plats.length ? Math.min(...plats.map((p) => p.y)) : g.H;
      while (top > -20) { top -= api.rand(55, gapMax()); add(top); }
      if (py - r > g.H) { api.haptic('error'); return api.end(); }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      for (const p of plats) {
        x.fillStyle = p.kind === 'break' ? C.warn : p.kind === 'move' ? C.accent : C.good;
        api.rr(x, p.x, p.y, pw, ph, 5); x.fill();
      }
      x.fillStyle = C.fg; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    });
  },
});
