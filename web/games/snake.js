Arcade.register({
  howto: 'Свайпай (или стрелки), чтобы поворачивать. Ешь ягоды и не врезайся в стены и в себя.',
  start(api) {
    const g = api.canvas(), C = api.colors, x = g.ctx;
    const cols = 15, cell = Math.floor(g.W / cols), rows = Math.max(10, Math.floor(g.H / cell));
    const ox = (g.W - cols * cell) / 2, oy = (g.H - rows * cell) / 2;
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const my = rows >> 1;
    const snake = [[4, my], [3, my], [2, my]];
    let dir = [1, 0], queue = [], food, acc = 0;

    const hits = (p, body) => body.some((s) => s[0] === p[0] && s[1] === p[1]);
    function place() {
      if (snake.length >= cols * rows) return api.end();
      do food = [api.randi(cols), api.randi(rows)]; while (hits(food, snake));
    }
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
      if (h[0] < 0 || h[1] < 0 || h[0] >= cols || h[1] >= rows || hits(h, eat ? snake : snake.slice(0, -1))) {
        api.haptic('error');
        return api.end();
      }
      snake.unshift(h);
      if (eat) { api.addScore(1); api.haptic('light'); api.tone(660, 60); place(); } else snake.pop();
    }

    function draw() {
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(ox, oy, cols * cell, rows * cell);
      x.fillStyle = C.bad;
      x.beginPath(); x.arc(ox + food[0] * cell + cell / 2, oy + food[1] * cell + cell / 2, cell * 0.36, 0, 7); x.fill();
      snake.forEach((s, i) => {
        x.fillStyle = i ? C.good : C.fg;
        x.globalAlpha = i ? Math.max(0.5, 1 - i * 0.015) : 1;
        api.rr(x, ox + s[0] * cell + 1, oy + s[1] * cell + 1, cell - 2, cell - 2, cell * 0.3); x.fill();
      });
      x.globalAlpha = 1;
    }

    api.loop((dt) => {
      acc += dt;
      const step = Math.max(0.065, 0.15 - api.score * 0.003);
      while (acc >= step) { acc -= step; tick(); if (api.ended) return; }
      draw();
    });
  },
});
