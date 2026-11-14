// Эволюция: сдвигай поле 5×5, одинаковые существа сливаются в следующую стадию
Arcade.register({
  howto: L('Свайпай (или стрелки): все фигурки съезжают в ту сторону. Две одинаковые при встрече превращаются в следующую стадию: 🥚 → 🐣 → 🐥 → 🐓 → 🦆 → 🦢 → 🦅 → 🦚 → 🦄 → 🐉. После каждого хода появляется новое яйцо. Очки — за каждое слияние.', 'Swipe (or use the arrows): all pieces slide that way. Two identical ones merge into the next stage: 🥚 → 🐣 → 🐥 → 🐓 → 🦆 → 🦢 → 🦅 → 🦚 → 🦄 → 🐉. A new egg appears after every move. Points for every merge.'),
  start(api) {
    const STAGES = ['🥚', '🐣', '🐥', '🐓', '🦆', '🦢', '🦅', '🦚', '🦄', '🐉'];
    const N = 5;
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box, L('Лучшая стадия: 🥚', 'Best stage: 🥚'));
    const grid = api.el('div', 'grid', box);
    grid.style.cssText += `;grid-template-columns:repeat(${N},1fr);gap:6px;max-width:min(92vw,54vh);padding:8px;border-radius:18px;background:var(--card)`;
    const tiles = [...Array(N * N)].map(() => {
      const t = api.el('div', 'tile', grid);
      t.style.cssText = 'font-size:min(9vw,40px);background:color-mix(in srgb, var(--fg) 6%, transparent);transition:transform .1s';
      return t;
    });
    let board = Array(N * N).fill(-1), top = 0;

    function spawn() {
      const free = board.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0);
      if (!free.length) return;
      board[api.pick(free)] = api.rand() < 0.1 ? 1 : 0;
    }
    function draw(merged = new Set()) {
      board.forEach((v, i) => {
        tiles[i].textContent = v >= 0 ? STAGES[v] : '';
        tiles[i].style.background = v >= 0 ? `hsl(${40 + v * 32} 70% 55% / .28)` : 'color-mix(in srgb, var(--fg) 6%, transparent)';
        if (merged.has(i)) tiles[i].animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 160 });
      });
      info.textContent = L(`Лучшая стадия: ${STAGES[top]} (${top + 1}/${STAGES.length})`, `Best stage: ${STAGES[top]} (${top + 1}/${STAGES.length})`);
    }
    const line = (k, dir) => [...Array(N).keys()].map((j) => {
      if (dir === 'left') return k * N + j;
      if (dir === 'right') return k * N + (N - 1 - j);
      if (dir === 'up') return j * N + k;
      return (N - 1 - j) * N + k;
    });
    function canMove() {
      if (board.includes(-1)) return true;
      for (let i = 0; i < N * N; i++) {
        if (i % N < N - 1 && board[i] === board[i + 1]) return true;
        if (i + N < N * N && board[i] === board[i + N]) return true;
      }
      return false;
    }
    api.onSwipe((dir) => {
      let moved = false, pts = 0;
      const merged = new Set();
      for (let k = 0; k < N; k++) {
        const idx = line(k, dir);
        const vals = idx.map((i) => board[i]).filter((v) => v >= 0);
        const out = [];
        for (let j = 0; j < vals.length; j++) {
          if (j + 1 < vals.length && vals[j] === vals[j + 1] && vals[j] < STAGES.length - 1) {
            const nv = vals[j] + 1;
            out.push(nv); pts += 2 ** (nv + 1); top = Math.max(top, nv);
            merged.add(idx[out.length - 1]); j++;
          } else out.push(vals[j]);
        }
        idx.forEach((i, j) => {
          const v = j < out.length ? out[j] : -1;
          if (board[i] !== v) moved = true;
          board[i] = v;
        });
      }
      if (!moved) { api.haptic('error'); return; }
      if (pts) { api.addScore(pts); api.haptic(merged.size > 1 ? 'medium' : 'light'); api.tone(500 + top * 60, 70); }
      spawn(); draw(merged);
      if (!canMove()) api.after(700, () => api.end());
    });
    spawn(); spawn(); draw();
  },
});
