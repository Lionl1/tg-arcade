// Ниндзя: карабкайся по двум стенам, перепрыгивая шипы
Arcade.register({
  howto: L('Ниндзя бежит вверх по стене. Тап (или пробел) — прыжок на противоположную стену. Шипы на стене — смерть, в прыжке над ними пролетаешь. Монеты +5.', 'The ninja runs up the wall. Tap (or space) to jump to the opposite wall. Spikes on the wall are deadly; mid-jump you fly over them. Coins +5.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const WALL = 26, r = 13, JUMP = 0.38;
    let side = 0, air = 0, height = 0, coins = 0, obs = [], nextY = 0, dead = false, cx = 0;
    const wallX = (sd) => (sd === 0 ? WALL + r : g.W - WALL - r);
    api.onAction(() => { if (!dead && air <= 0) { air = JUMP; side = 1 - side; api.haptic('light'); } });

    api.loop((dt) => {
      const py = g.H * 0.7;
      const speed = Math.min(560, 220 + height / 25);
      if (!dead) {
        height += speed * dt;
        air = Math.max(0, air - dt);
        // спавн по высоте: шипы чередуются, расстояние между шипами на разных стенах ≥ длины прыжка
        while (nextY < height + g.H) {
          const sd = api.randi(2), len = api.rand(50, 110);
          if (api.rand() < 0.75) obs.push({ kind: 'spike', side: sd, y: nextY + g.H, len });
          else obs.push({ kind: 'coin', side: sd, y: nextY + g.H, len: 20 });
          nextY += Math.max(speed * JUMP + 60, 260 - height / 200) + api.rand(0, 120);
        }
        const t = air > 0 ? 1 - air / JUMP : 1;
        cx = air > 0 ? wallX(1 - side) + (wallX(side) - wallX(1 - side)) * t : wallX(side);
        for (const o of obs) {
          const oy = py - (o.y - height);
          if (o.hit) continue;
          if (o.kind === 'coin') {
            if (Math.abs(oy - py) < 22 && Math.abs(wallX(o.side) - cx) < 26) { o.hit = true; coins++; api.tone(990, 40); }
          } else if (air <= 0 && o.side === side && py > oy - o.len && py < oy) {
            dead = true; api.haptic('heavy'); api.after(600, () => api.end());
          }
        }
        obs = obs.filter((o) => py - (o.y - height) < g.H + 150 && !o.hit);
        api.setScore(Math.floor(height / 40) + coins * 5);
      }
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(0, 0, WALL, g.H); x.fillRect(g.W - WALL, 0, WALL, g.H);
      for (const o of obs) {
        const oy = py - (o.y - height);
        if (o.kind === 'coin') { x.fillStyle = C.warn; x.beginPath(); x.arc(wallX(o.side), oy - 10, 8, 0, 7); x.fill(); continue; }
        x.fillStyle = C.bad;
        const n = Math.max(2, Math.round(o.len / 16)), h = o.len / n, wx = o.side === 0 ? WALL : g.W - WALL, d = o.side === 0 ? 1 : -1;
        for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(wx, oy - i * h); x.lineTo(wx + d * 16, oy - i * h - h / 2); x.lineTo(wx, oy - (i + 1) * h); x.fill(); }
      }
      x.font = '26px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(dead ? '💥' : '🥷', cx || wallX(side), py);
    });
  },
});
