Arcade.register({
  howto: 'Веди пальцем свою ракетку внизу и забивай компьютеру. Пропустишь 3 мяча — конец.',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors, keys = api.keys();
    const ph = 12, br = 8;
    let pw = g.W * 0.24, px = g.W / 2, ax = g.W / 2, aiErr = 0, lives = 3, ball, wait = 0.8;

    function serve(down) {
      const s = 280 + api.score * 12;
      ball = { x: g.W / 2, y: g.H / 2, vx: api.rand(-0.4, 0.4) * s, vy: (down ? 1 : -1) * s };
      wait = 0.7;
    }
    function bounce(paddleX, up) {
      const off = api.clamp((ball.x - paddleX) / (pw / 2), -1, 1) * 0.9;
      const s = Math.min(900, Math.hypot(ball.vx, ball.vy) * 1.04);
      ball.vx = Math.sin(off) * s; ball.vy = (up ? -1 : 1) * Math.cos(off) * s;
    }
    serve(true);

    api.on(api.stage, 'pointerdown', (e) => { px = api.pos(e).x; });
    api.on(api.stage, 'pointermove', (e) => { px = api.pos(e).x; });

    function step(dt) {
      const top = 40, bot = g.H - 40 - ph;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < br) { ball.x = br; ball.vx = Math.abs(ball.vx); }
      if (ball.x > g.W - br) { ball.x = g.W - br; ball.vx = -Math.abs(ball.vx); }
      if (ball.vy > 0 && ball.y + br >= bot && ball.y + br <= bot + ph + 10 && Math.abs(ball.x - px) < pw / 2 + br) {
        bounce(px, true); api.haptic('light'); api.tone(440, 40);
        aiErr = api.rand(-pw * 0.45, pw * 0.45);
      }
      if (ball.vy < 0 && ball.y - br <= top + ph && ball.y - br >= top - 10 && Math.abs(ball.x - ax) < pw / 2 + br) {
        bounce(ax, false); api.tone(330, 40);
      }
      if (ball.y > g.H + br) {
        api.haptic('error');
        if (--lives <= 0) return api.end();
        serve(false);
      } else if (ball.y < -br) {
        api.addScore(1); api.haptic('success'); api.tone(880, 120);
        serve(true);
      }
    }

    api.loop((dt) => {
      pw = g.W * 0.24;
      const k = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      px = api.clamp(px + k * 600 * dt, pw / 2, g.W - pw / 2);
      const aiSpeed = 210 + api.score * 20;
      const goal = ball.vy < 0 ? ball.x + aiErr : g.W / 2;
      ax += api.clamp(goal - ax, -aiSpeed * dt, aiSpeed * dt);
      ax = api.clamp(ax, pw / 2, g.W - pw / 2);
      if (wait > 0) wait -= dt;
      else for (let i = 0; i < 4 && !api.ended; i++) step(dt / 4);
      if (api.ended) return;

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.strokeStyle = C.card; x.setLineDash([8, 10]); x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, g.H / 2); x.lineTo(g.W, g.H / 2); x.stroke(); x.setLineDash([]);
      x.fillStyle = C.bad; api.rr(x, ax - pw / 2, 40, pw, ph, 6); x.fill();
      x.fillStyle = C.accent; api.rr(x, px - pw / 2, g.H - 40 - ph, pw, ph, 6); x.fill();
      x.fillStyle = C.fg; x.beginPath(); x.arc(ball.x, ball.y, br, 0, 7); x.fill();
      x.font = '16px system-ui'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillText('❤️'.repeat(lives), 10, g.H - 10);
    });
  },
});
