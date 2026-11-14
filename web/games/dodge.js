Arcade.register({
  howto: L('Веди пальцем (или стрелками), чтобы двигать платформу. Каждая пролетевшая глыба — очко.', 'Drag (or use the arrows) to move the platform. Every boulder that flies past is a point.'),
  start(api) {
    const g = api.canvas(), C = api.colors, x = g.ctx, keys = api.keys();
    const pw = 54, ph = 14;
    let px = g.W / 2, target = px, blocks = [], t = 0, spawn = 0.5, dead = false;

    const aim = (e) => { target = api.pos(e).x; };
    api.on(api.stage, 'pointerdown', aim);
    api.on(api.stage, 'pointermove', aim);

    api.loop((dt) => {
      const py = g.H - 56;
      if (!dead) {
        t += dt;
        const k = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
        if (k) target = px + k * 30;
        target = api.clamp(target, pw / 2, g.W - pw / 2);
        px += (target - px) * Math.min(1, dt * 16);

        spawn -= dt;
        if (spawn <= 0) {
          const s = api.rand(18, 42);
          blocks.push({ x: api.rand(0, g.W - s), y: -s, s, v: api.rand(170, 250) + t * 9, c: api.pick(C.palette) });
          spawn = Math.max(0.14, 0.6 - t * 0.012);
        }
        for (const b of blocks) {
          b.y += b.v * dt;
          if (b.y + b.s > py && b.y < py + ph && b.x < px + pw / 2 && b.x + b.s > px - pw / 2) {
            dead = true; api.haptic('heavy'); api.after(450, () => api.end()); break;
          }
          if (!b.passed && b.y > py + ph) { b.passed = true; api.addScore(1); }
        }
        blocks = blocks.filter((b) => b.y < g.H + 50);
      }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      for (const b of blocks) { x.fillStyle = b.c; api.rr(x, b.x, b.y, b.s, b.s, 6); x.fill(); }
      x.fillStyle = dead ? C.bad : C.accent;
      api.rr(x, px - pw / 2, py, pw, ph, 7); x.fill();
    });
  },
});
