Arcade.register({
  howto: L('Свайпай (или стрелки), чтобы поворачивать. Ешь ягоды и не врезайся в стены и в себя.', 'Swipe (or use the arrows) to turn. Eat berries and do not crash into the walls or yourself.'),
  chapters: {
    2: L('камни на поле — объезжай', 'rocks on the field — steer around them'),
    3: L('золотая ягода ✨ = +3, исчезает через 5 секунд', 'golden berry ✨ = +3, vanishes after 5 seconds'),
    4: L('каждая 5-я ягода добавляет камень', 'every 5th berry adds a rock'),
  },
  start(api) {
    const ch = api.chapter;
    const g = api.canvas(), C = api.colors, x = g.ctx;
    const cols = 15, cell = Math.floor(g.W / cols), rows = Math.max(10, Math.floor(g.H / cell));
    const ox = (g.W - cols * cell) / 2, oy = (g.H - rows * cell) / 2;
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const my = rows >> 1;
    const snake = [[4, my], [3, my], [2, my]];
    let dir = [1, 0], queue = [], food, acc = 0, gold = null, eaten = 0;
    const rocks = [];

    const hits = (p, body) => body.some((s) => s[0] === p[0] && s[1] === p[1]);
    const free = () => { let p; do p = [api.randi(cols), api.randi(rows)]; while (hits(p, snake) || hits(p, rocks) || (food && hits(p, [food])) || (gold && hits(p, [gold.p]))); return p; };
    function addRock() { // не на пути головы: камни только дальше 3 клеток от неё
      let p, n = 0;
      do p = free(); while (Math.abs(p[0] - snake[0][0]) + Math.abs(p[1] - snake[0][1]) < 4 && ++n < 50);
      rocks.push(p);
    }
    function place() {
      if (snake.length + rocks.length >= cols * rows - 2) return api.end();
      food = null; food = free();
    }
    if (ch >= 2) for (let i = 0; i < Math.min(14, 3 + (ch - 2) * 3); i++) addRock();
    place();

    api.onSwipe((d) => {
      const v = D[d], last = queue.length ? queue[queue.length - 1] : dir;
      if ((v[0] === -last[0] && v[1] === -last[1]) || (v[0] === last[0] && v[1] === last[1])) return;
      if (queue.length < 3) queue.push(v);
    });

    function tick() {
      if (queue.length) dir = queue.shift();
      const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      const eat = h[0] === food[0] && h[1] === food[1];
      if (h[0] < 0 || h[1] < 0 || h[0] >= cols || h[1] >= rows || hits(h, rocks) || hits(h, eat ? snake : snake.slice(0, -1))) {
        api.haptic('error');
        return api.end();
      }
      snake.unshift(h);
      if (gold && h[0] === gold.p[0] && h[1] === gold.p[1]) { gold = null; api.addScore(3); api.haptic('success'); api.tone(990, 90); }
      if (eat) {
        api.addScore(1); api.haptic('light'); api.tone(660, 60); eaten++;
        if (ch >= 4 && eaten % 5 === 0) addRock();
        place();
        if (ch >= 3 && !gold && api.rand() < 0.3) gold = { p: free(), t: 5 };
      } else snake.pop();
    }

    function draw() {
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(ox, oy, cols * cell, rows * cell);
      x.fillStyle = C.bad;
      x.beginPath(); x.arc(ox + food[0] * cell + cell / 2, oy + food[1] * cell + cell / 2, cell * 0.36, 0, 7); x.fill();
      x.fillStyle = C.hint;
      for (const r of rocks) { api.rr(x, ox + r[0] * cell + 2, oy + r[1] * cell + 2, cell - 4, cell - 4, cell * 0.2); x.fill(); }
      if (gold) {
        x.fillStyle = C.warn; x.globalAlpha = gold.t < 1.5 ? 0.4 + 0.6 * Math.abs(Math.sin(gold.t * 8)) : 1;
        x.beginPath(); x.arc(ox + gold.p[0] * cell + cell / 2, oy + gold.p[1] * cell + cell / 2, cell * 0.42, 0, 7); x.fill();
        x.globalAlpha = 1;
      }
      snake.forEach((s, i) => {
        x.fillStyle = i ? C.good : C.fg;
        x.globalAlpha = i ? Math.max(0.5, 1 - i * 0.015) : 1;
        api.rr(x, ox + s[0] * cell + 1, oy + s[1] * cell + 1, cell - 2, cell - 2, cell * 0.3); x.fill();
      });
      x.globalAlpha = 1;
    }

    api.loop((dt) => {
      acc += dt;
      if (gold && (gold.t -= dt) <= 0) gold = null;
      const step = Math.max(0.065, 0.15 - api.score * 0.003);
      while (acc >= step) { acc -= step; tick(); if (api.ended) return; }
      draw();
    });
  },
});
