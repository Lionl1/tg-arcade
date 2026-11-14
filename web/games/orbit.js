Arcade.register({
  howto: L('Точка бежит по кругу. Тап (или пробел) меняет направление. Собирай звёзды и не врезайся в шипы.', 'The dot runs around a circle. Tap (or space) to reverse. Collect stars and avoid the spikes.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors, TAU = Math.PI * 2;
    const dist = (p, q) => { const d = (((p - q) % TAU) + TAU) % TAU; return Math.min(d, TAU - d); };
    let a = -Math.PI / 2, dir = 1, coin = 0, spikes = [], dead = false;

    function newCoin() { coin = a + dir * api.rand(1.4, 4.8); }
    function addSpike() {
      let ang, n = 0;
      do ang = api.rand(0, TAU); while ((dist(ang, a) < 1.3 || dist(ang, coin) < 0.4) && ++n < 30);
      spikes.push({ a: ang, t: 0, life: api.rand(4, 8) });
    }
    newCoin();

    api.onAction(() => { if (!dead) { dir *= -1; api.haptic('select'); } });

    api.loop((dt) => {
      const cx = g.W / 2, cy = g.H / 2, R = Math.min(g.W, g.H) * 0.33;
      if (!dead) {
        a += dir * Math.min(4, 2.2 + api.score * 0.05) * dt;
        if (dist(a, coin) < 0.16) { api.addScore(1); api.haptic('light'); api.tone(880, 50); newCoin(); }
        const want = Math.min(8, 1 + Math.floor(api.score / 3));
        for (const s of spikes) {
          s.t += dt;
          if (s.t > 0.7 && dist(a, s.a) < 0.12) { dead = true; api.haptic('heavy'); api.after(500, () => api.end()); }
        }
        spikes = spikes.filter((s) => s.t < s.life);
        while (spikes.length < want) addSpike();
      }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.strokeStyle = C.card; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
      x.fillStyle = C.warn; x.font = '24px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('⭐', cx + Math.cos(coin) * R, cy + Math.sin(coin) * R);
      for (const s of spikes) {
        x.globalAlpha = s.t < 0.7 ? 0.25 + s.t / 0.7 * 0.35 : 1;
        x.fillStyle = C.bad;
        x.save(); x.translate(cx + Math.cos(s.a) * R, cy + Math.sin(s.a) * R); x.rotate(s.a);
        x.beginPath(); x.moveTo(-14, -9); x.lineTo(10, 0); x.lineTo(-14, 9); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(14, -9); x.lineTo(-10, 0); x.lineTo(14, 9); x.closePath(); x.fill();
        x.restore();
      }
      x.globalAlpha = 1;
      x.fillStyle = dead ? C.bad : C.fg;
      x.beginPath(); x.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 10, 0, TAU); x.fill();
      x.fillStyle = C.hint; x.font = '600 40px system-ui'; x.fillText(api.score, cx, cy);
    });
  },
});
