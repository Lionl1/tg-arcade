Arcade.register({
  howto: 'Тапай (или пробел), чтобы шарик подлетал. Пролетай в просветы между колоннами.',
  start(api) {
    const g = api.canvas(), C = api.colors, x = g.ctx;
    const r = 15, px = g.W * 0.28, w = 58, G = 1150, FLAP = -360;
    const gap = Math.max(150, g.H * 0.27);
    let y = g.H * 0.4, vy = 0, started = false, pipes = [], spawnT = 0, dead = false;

    api.onAction(() => {
      if (dead) return;
      started = true; vy = FLAP; api.haptic('light');
    });

    function die() {
      dead = true; api.haptic('error'); api.tone(160, 250, 'square', 0.08);
      api.after(500, () => api.end());
    }

    api.loop((dt, t) => {
      if (!started) y = g.H * 0.4 + Math.sin(t / 300) * 6;
      else {
        vy += G * dt; y += vy * dt;
        if (y - r < 0) { y = r; vy = 0; }
        if (!dead) {
          const sp = 150 + api.score * 4;
          spawnT -= dt;
          if (spawnT <= 0) { pipes.push({ x: g.W + w, top: api.rand(50, g.H - 50 - gap), passed: false }); spawnT = Math.max(1.15, 1.6 - api.score * 0.02); }
          for (const p of pipes) {
            p.x -= sp * dt;
            if (!p.passed && p.x + w < px - r) { p.passed = true; api.addScore(1); api.tone(880, 50); }
            if (px + r > p.x && px - r < p.x + w && (y - r < p.top || y + r > p.top + gap)) { die(); break; }
          }
          pipes = pipes.filter((p) => p.x > -w);
          if (y + r > g.H && !dead) die();
        }
      }
      // draw
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.good;
      for (const p of pipes) {
        api.rr(x, p.x, -10, w, p.top + 10, 10); x.fill();
        api.rr(x, p.x, p.top + gap, w, g.H - p.top - gap + 10, 10); x.fill();
      }
      x.strokeStyle = C.hint; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(px, y + r); x.quadraticCurveTo(px - 6, y + r + 14, px, y + r + 26); x.stroke();
      x.fillStyle = dead ? C.hint : C.bad;
      x.beginPath(); x.ellipse(px, y, r, r * 1.15, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.45)';
      x.beginPath(); x.ellipse(px - 5, y - 6, 4, 6, -0.5, 0, 7); x.fill();
      if (!started) {
        x.fillStyle = C.fg; x.font = '600 18px system-ui'; x.textAlign = 'center';
        x.fillText('Тапни, чтобы взлететь', g.W / 2, g.H * 0.65);
      }
    });
  },
});
