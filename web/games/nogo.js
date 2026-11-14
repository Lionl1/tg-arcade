Arcade.register({
  howto: L('Жми зелёные кружки, пока не исчезли. Красные не трогай! Ошибка или пропуск — минус жизнь, всего 3.', 'Tap the green circles before they vanish. Never tap the red ones! A mistake or a miss costs a life, 3 in total.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    let items = [], spawn = 0.4, lives = 3;

    function lose() {
      api.haptic('error');
      if (--lives <= 0) api.end();
    }
    function add() {
      const r = 30;
      for (let n = 0; n < 12; n++) {
        const p = { x: api.rand(r + 6, g.W - r - 6), y: api.rand(r + 30, g.H - r - 6) };
        if (items.every((it) => Math.hypot(it.x - p.x, it.y - p.y) > r * 2.3)) {
          items.push({ ...p, r, red: api.rand() < 0.32, age: 0, life: Math.max(0.75, 1.7 - api.score * 0.02) });
          return;
        }
      }
    }

    api.onTap((px, py) => {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (Math.hypot(px - it.x, py - it.y) > it.r + 6) continue;
        items.splice(i, 1);
        if (it.red) lose();
        else { api.addScore(1); api.haptic('light'); api.tone(760, 40); }
        return;
      }
    });

    api.loop((dt) => {
      spawn -= dt;
      if (spawn <= 0) { add(); spawn = Math.max(0.28, 0.75 - api.score * 0.01); }
      for (const it of items) it.age += dt;
      const expired = items.filter((it) => it.age >= it.life);
      items = items.filter((it) => it.age < it.life);
      for (const it of expired) if (!it.red) { lose(); if (api.ended) return; }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      for (const it of items) {
        const k = 1 - it.age / it.life;
        x.fillStyle = it.red ? C.bad : C.good;
        x.beginPath(); x.arc(it.x, it.y, it.r * Math.min(1, it.age * 8), 0, 7); x.fill();
        x.strokeStyle = C.fg; x.lineWidth = 3;
        x.beginPath(); x.arc(it.x, it.y, it.r + 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); x.stroke();
      }
      x.font = '16px system-ui'; x.textAlign = 'left'; x.textBaseline = 'top';
      x.fillText('❤️'.repeat(Math.max(0, lives)), 10, 8);
    });
  },
});
