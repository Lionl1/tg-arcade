Arcade.register({
  howto: 'Попадай по мишеням. Они уменьшаются и исчезают всё быстрее. Промах — минус очко. 30 секунд.',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    let tg = null, pops = [];

    function spawn() {
      const r = Math.max(16, 38 - api.score * 0.6), life = Math.max(0.75, 1.9 - api.score * 0.035);
      tg = { x: api.rand(r + 8, g.W - r - 8), y: api.rand(r + 8, g.H - r - 8), r, life, age: 0 };
    }
    spawn();
    api.timer(30);

    api.onTap((px, py) => {
      const d = Math.hypot(px - tg.x, py - tg.y), k = 1 - tg.age / tg.life * 0.5;
      if (d <= tg.r * k + 6) {
        api.addScore(1); api.haptic('light'); api.tone(820, 40);
        pops.push({ x: tg.x, y: tg.y, r: tg.r * k, a: 1 });
        spawn();
      } else {
        api.setScore(Math.max(0, api.score - 1)); api.haptic('error');
        pops.push({ x: px, y: py, r: 6, a: 1, miss: true });
      }
    });

    api.loop((dt) => {
      tg.age += dt;
      if (tg.age >= tg.life) spawn();
      for (const p of pops) { p.a -= dt * 3; p.r += dt * 60; }
      pops = pops.filter((p) => p.a > 0);

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      const r = tg.r * (1 - tg.age / tg.life * 0.5);
      [[1, C.bad], [0.66, C.fg], [0.33, C.bad]].forEach(([k, c]) => {
        x.fillStyle = c; x.beginPath(); x.arc(tg.x, tg.y, r * k, 0, 7); x.fill();
      });
      for (const p of pops) {
        x.strokeStyle = p.miss ? C.hint : C.good; x.globalAlpha = Math.max(0, p.a); x.lineWidth = 3;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.stroke();
      }
      x.globalAlpha = 1;
    });
  },
});
