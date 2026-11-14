Arcade.register({
  howto: L('Веди пальцем, чтобы двигать платформу. Тап — запустить мяч. 3 жизни.', 'Drag to move the paddle. Tap to launch the ball. 3 lives.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors, keys = api.keys();
    const pw = Math.max(70, g.W * 0.22), ph = 12, br = 7;
    const cols = 7, rows = 6, pad = 6, top = 50;
    let px = g.W / 2, lives = 3, level = 0, bricks = [], ball, held = true;

    function build() {
      const bw = (g.W - pad * (cols + 1)) / cols, bh = 18;
      bricks = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        bricks.push({ x: pad + c * (bw + pad), y: top + r * (bh + pad), w: bw, h: bh, c: C.palette[r % C.palette.length] });
    }
    const speed = () => Math.min(620, 330 + level * 40 + api.score * 2);
    function reset() { held = true; ball = { x: px, y: g.H - 60 - br, vx: 0, vy: 0 }; }
    function launch() {
      if (!held) return;
      held = false;
      const a = api.rand(-0.5, 0.5);
      ball.vx = Math.sin(a) * speed(); ball.vy = -Math.cos(a) * speed();
    }
    build(); reset();

    api.on(api.stage, 'pointermove', (e) => { px = api.pos(e).x; });
    api.on(api.stage, 'pointerdown', (e) => { px = api.pos(e).x; launch(); });
    api.on(window, 'keydown', (e) => { if (e.code === 'Space') launch(); });

    function step(dt) {
      const py = g.H - 60;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < br) { ball.x = br; ball.vx = Math.abs(ball.vx); }
      if (ball.x > g.W - br) { ball.x = g.W - br; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < br) { ball.y = br; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && ball.y + br >= py && ball.y + br <= py + ph + 8 && Math.abs(ball.x - px) <= pw / 2 + br) {
        const off = api.clamp((ball.x - px) / (pw / 2), -1, 1) * 1.05, s = speed();
        ball.vx = Math.sin(off) * s; ball.vy = -Math.cos(off) * s;
        api.haptic('light');
      }
      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        const nx = api.clamp(ball.x, b.x, b.x + b.w), ny = api.clamp(ball.y, b.y, b.y + b.h);
        const dx = ball.x - nx, dy = ball.y - ny;
        if (dx * dx + dy * dy > br * br) continue;
        if (Math.abs(dx) > Math.abs(dy)) ball.vx = Math.sign(dx || -ball.vx) * Math.abs(ball.vx);
        else ball.vy = Math.sign(dy || -ball.vy) * Math.abs(ball.vy);
        bricks.splice(i, 1);
        api.addScore(1); api.tone(500 + (rows * 60 - (b.y - top) * 3), 40);
        break;
      }
      if (!bricks.length) { level++; build(); reset(); api.haptic('success'); }
      if (ball.y > g.H + br) {
        lives--; api.haptic('error');
        if (lives <= 0) return api.end();
        reset();
      }
    }

    api.loop((dt) => {
      const k = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      px = api.clamp(px + k * 520 * dt, pw / 2, g.W - pw / 2);
      if (held) { ball.x = px; ball.y = g.H - 60 - br; }
      else for (let i = 0; i < 4 && !api.ended; i++) step(dt / 4);
      if (api.ended) return;

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      for (const b of bricks) { x.fillStyle = b.c; api.rr(x, b.x, b.y, b.w, b.h, 4); x.fill(); }
      x.fillStyle = C.accent; api.rr(x, px - pw / 2, g.H - 60, pw, ph, 6); x.fill();
      x.fillStyle = C.fg; x.beginPath(); x.arc(ball.x, ball.y, br, 0, 7); x.fill();
      x.font = '16px system-ui'; x.textAlign = 'left'; x.fillText('❤️'.repeat(lives), 10, 28);
      if (held) { x.textAlign = 'center'; x.fillStyle = C.hint; x.fillText(L('Тапни, чтобы запустить', 'Tap to launch'), g.W / 2, g.H - 100); }
    });
  },
});
