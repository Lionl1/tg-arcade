// Слалом: веди лыжника пальцем через ворота, объезжай ёлки
Arcade.register({
  howto: 'Веди пальцем влево-вправо (или стрелки). Проезжай между флажками ворот (+1). Пропустил ворота — минус жизнь, врезался в ёлку — конец. Склон всё круче.',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors, keys = api.keys();
    let px = g.W / 2, target = px, objs = [], next = 0.8, dist = 0, lives = 3, dead = false, trail = [];
    const aim = (e) => { target = api.pos(e).x; };
    api.on(api.stage, 'pointerdown', aim);
    api.on(api.stage, 'pointermove', aim);

    api.loop((dt) => {
      const py = g.H * 0.25;
      const speed = Math.min(560, 220 + dist / 30);
      if (!dead) {
        dist += speed * dt;
        const k = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
        if (k) target = px + k * 40;
        target = api.clamp(target, 14, g.W - 14);
        px += (target - px) * Math.min(1, dt * 7);
        next -= dt;
        if (next <= 0) {
          const gap = Math.max(70, 140 - dist / 300);
          const gx = api.rand(gap / 2 + 20, g.W - gap / 2 - 20);
          objs.push({ kind: 'gate', x: gx, gap, y: g.H + 20 });
          const treeX = gx + (api.rand() < 0.5 ? -1 : 1) * api.rand(gap * 0.9, gap * 2);
          if (treeX > 12 && treeX < g.W - 12) objs.push({ kind: 'tree', x: treeX, y: g.H + 20 + api.rand(60, 110) });
          next = Math.max(0.65, 1.25 - dist / 25000);
        }
        for (const o of objs) {
          o.y -= speed * dt;
          if (o.kind === 'tree' && !o.hit && Math.abs(o.y - py) < 16 && Math.abs(o.x - px) < 18) {
            dead = true; api.haptic('heavy'); api.after(600, () => api.end());
          }
          if (o.kind === 'gate' && !o.done && o.y < py) {
            o.done = true;
            if (Math.abs(px - o.x) < o.gap / 2) { o.ok = true; api.addScore(1); api.haptic('light'); api.tone(820, 50); }
            else { lives--; api.haptic('error'); if (lives <= 0) { dead = true; api.after(500, () => api.end()); } }
          }
        }
        objs = objs.filter((o) => o.y > -40);
        trail.push({ x: px, y: py });
        trail = trail.map((p) => ({ x: p.x, y: p.y - speed * dt })).filter((p) => p.y > -10).slice(-60);
      }
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.strokeStyle = C.card; x.lineWidth = 3; x.beginPath();
      trail.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.stroke();
      x.font = '26px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const o of objs) {
        if (o.kind === 'tree') { x.fillText('🌲', o.x, o.y); continue; }
        x.fillStyle = o.done ? (o.ok ? C.good : C.hint) : C.bad;
        for (const s of [-1, 1]) { x.fillRect(o.x + s * o.gap / 2 - 2, o.y - 16, 4, 22); x.beginPath(); x.moveTo(o.x + s * o.gap / 2, o.y - 16); x.lineTo(o.x + s * o.gap / 2 + s * -12, o.y - 10); x.lineTo(o.x + s * o.gap / 2, o.y - 4); x.fill(); }
      }
      x.fillText(dead ? '💥' : '⛷️', px, py);
      x.font = '16px system-ui'; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText('❤️'.repeat(Math.max(0, lives)), 10, 8);
    });
  },
});
