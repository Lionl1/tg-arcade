Arcade.register({
  howto: L('Свайпай (или стрелки): точка катится по коридору до развилки. Доберись до флажка. Каждый пройденный лабиринт +1 очко и +5 секунд.', 'Swipe (or use the arrows): the dot rolls along the corridor to the next fork. Reach the flag. Each maze solved gives +1 point and +5 seconds.'),
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    const DIRS = { up: [0, -1, 1], right: [1, 0, 2], down: [0, 1, 4], left: [-1, 0, 8] };
    const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
    let cols, rows, cell, ox, oy, open, pos, path = [], draw = { x: 0, y: 0 }, level = 0;
    const tm = api.timer(60);

    function build() {
      cols = Math.min(15, 6 + level);
      cell = Math.floor(Math.min((g.W - 16) / cols, (g.H - 16) / Math.round(cols * 1.5)));
      rows = Math.floor((g.H - 16) / cell);
      ox = (g.W - cols * cell) / 2; oy = (g.H - rows * cell) / 2;
      open = new Array(cols * rows).fill(0);
      const seen = new Array(cols * rows).fill(false), stack = [0];
      seen[0] = true;
      while (stack.length) {
        const c = stack[stack.length - 1], cx = c % cols, cy = Math.floor(c / cols);
        const nb = Object.values(DIRS).map(([dx, dy, bit]) => [cx + dx, cy + dy, bit])
          .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx]);
        if (!nb.length) { stack.pop(); continue; }
        const [nx, ny, bit] = api.pick(nb), n = ny * cols + nx;
        open[c] |= bit; open[n] |= OPP[bit]; seen[n] = true; stack.push(n);
      }
      pos = 0; path = []; draw = { x: 0, y: 0 };
    }
    const exitCell = () => cols * rows - 1;
    const exits = (c) => [1, 2, 4, 8].filter((b) => open[c] & b);

    function move(dname) {
      if (path.length) return;
      let [, , bit] = DIRS[dname], c = pos;
      if (!(open[c] & bit)) { api.haptic('error'); return; }
      const step = (cc, b) => cc + (b === 1 ? -cols : b === 4 ? cols : b === 2 ? 1 : -1);
      for (let guard = 0; guard < cols * rows; guard++) {
        c = step(c, bit); path.push(c);
        if (c === exitCell()) break;
        const ex = exits(c).filter((b) => b !== OPP[bit]);
        if (ex.length !== 1) break;
        bit = ex[0];
      }
      api.haptic('light');
    }
    api.onSwipe(move);
    build();

    api.loop((dt) => {
      if (path.length) {
        const t = path[0], tx = t % cols, ty = Math.floor(t / cols);
        const sp = 22 * dt;
        const dx = tx - draw.x, dy = ty - draw.y, d = Math.hypot(dx, dy);
        if (d <= sp) {
          draw = { x: tx, y: ty }; pos = path.shift();
          if (pos === exitCell()) {
            api.addScore(1); tm.add(5); api.haptic('success'); api.tone(990, 120);
            level++; build();
          }
        } else { draw.x += dx / d * sp; draw.y += dy / d * sp; }
      }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.fillStyle = C.card; x.fillRect(ox, oy, cols * cell, rows * cell);
      x.strokeStyle = C.hint; x.lineWidth = Math.max(2, cell * 0.12); x.lineCap = 'round';
      x.beginPath();
      for (let c = 0; c < cols * rows; c++) {
        const X = ox + (c % cols) * cell, Y = oy + Math.floor(c / cols) * cell;
        if (!(open[c] & 1)) { x.moveTo(X, Y); x.lineTo(X + cell, Y); }
        if (!(open[c] & 8)) { x.moveTo(X, Y); x.lineTo(X, Y + cell); }
        if (c % cols === cols - 1) { x.moveTo(X + cell, Y); x.lineTo(X + cell, Y + cell); }
        if (Math.floor(c / cols) === rows - 1) { x.moveTo(X, Y + cell); x.lineTo(X + cell, Y + cell); }
      }
      x.stroke();
      x.font = `${cell * 0.7}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('🚩', ox + (cols - 0.5) * cell, oy + (rows - 0.5) * cell);
      x.fillStyle = C.accent;
      x.beginPath(); x.arc(ox + (draw.x + 0.5) * cell, oy + (draw.y + 0.5) * cell, cell * 0.32, 0, 7); x.fill();
    });
  },
});
