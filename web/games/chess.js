// Шахматные задачи из открытой базы Lichess (CC0). Правила ходов — chess.js (BSD-2).
// Рейтинг задач подстраивается: решил — следующая сложнее, ошибся — проще.
(() => {
  const THEMES = { mateIn1: 'Мат в 1 ход', mateIn2: 'Мат в 2 хода', mateIn3: 'Мат в 3 хода', mateIn4: 'Мат в 4 хода', fork: 'вилка', pin: 'связка',
    skewer: 'сквозной удар', hangingPiece: 'незащищённая фигура', discoveredAttack: 'вскрытое нападение', sacrifice: 'жертва', promotion: 'превращение пешки',
    endgame: 'эндшпиль', middlegame: 'миттельшпиль', opening: 'дебют', backRankMate: 'мат по последней горизонтали', deflection: 'отвлечение', trappedPiece: 'ловля фигуры' };
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

  function start(api, DATA) {
    const box = api.el('div', 'fill');
    box.style.gap = '8px';
    const info = api.el('div', 'hint', box);
    info.style.cssText = 'text-align:center;min-height:2.6em';
    const board = api.el('div', '', box);
    const S = Math.floor(Math.min(window.innerWidth * 0.94, window.innerHeight * 0.58) / 8);
    board.style.cssText = `display:grid;grid-template-columns:repeat(8,${S}px);border-radius:8px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.25)`;
    const sq = [];
    for (let i = 0; i < 64; i++) {
      const b = api.el('button', '', board);
      b.style.cssText = `width:${S}px;height:${S}px;border:0;padding:0;font-size:${S * 0.78}px;line-height:1;display:flex;align-items:center;justify-content:center;position:relative`;
      sq.push(b);
    }
    const note = api.el('div', 'hint', box);
    api.timer(300);

    const puzzles = DATA.puzzles; // [id, fen, moves, rating, themes]
    let rating = api.mode === 'level' ? Math.min(2850, 400 + 75 * (api.level - 1)) : 800;
    let game, line, ply, white, sel = null, busy = false, cur, used = new Set();

    const name = (r, c) => 'abcdefgh'[c] + (8 - r);
    const idx = (s) => { const c = s.charCodeAt(0) - 97, r = 8 - +s[1]; return white ? r * 8 + c : (7 - r) * 8 + (7 - c); };
    function pick() {
      let best = null, bestD = Infinity;
      for (let t = 0; t < 40; t++) {
        const p = puzzles[api.randi(puzzles.length)];
        const d = Math.abs(p[3] - rating);
        if (!used.has(p[0]) && d < bestD) { best = p; bestD = d; }
      }
      if (!best) { // случайные попытки попали только в решённые: ищем ближайшую нерешённую по всей базе
        for (const p of puzzles) { const d = Math.abs(p[3] - rating); if (!used.has(p[0]) && d < bestD) { best = p; bestD = d; } }
      }
      if (!best) { used.clear(); best = puzzles[api.randi(puzzles.length)]; } // прошли всю базу — начинаем заново
      used.add(best[0]);
      return best;
    }
    function draw(hl = []) {
      const b = game.board();
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const s = name(r, c), el = sq[idx(s)], p = b[r][c];
        const light = (r + c) % 2 === 0;
        el.style.background = hl.includes(s) ? (light ? '#f6f669' : '#baca2b') : light ? '#f0d9b5' : '#b58863';
        if (sel === s) el.style.background = '#7fc97f';
        el.textContent = p ? GLYPH[p.type] : '';
        el.style.color = p ? (p.color === 'w' ? '#fff' : '#111') : '';
        el.style.textShadow = p && p.color === 'w' ? '0 0 2px #000, 0 0 2px #000' : 'none';
        el.dataset.s = s;
      }
    }
    function play(uci) {
      const m = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
      draw([uci.slice(0, 2), uci.slice(2, 4)]);
      api.tone(m && m.captured ? 300 : 500, 60);
      return m;
    }
    function load() {
      cur = pick();
      game = new Chess(cur[1]);
      line = cur[2].split(' ');
      white = game.turn() === 'b'; // первый ход в задаче делает соперник, решаем за другую сторону
      ply = 0; sel = null; busy = true;
      const themes = cur[4].split(' ').map((t) => THEMES[t]).filter(Boolean);
      info.textContent = `Рейтинг задачи ${cur[3]} · играешь ${white ? 'белыми' : 'чёрными'}`;
      note.textContent = themes.length ? 'Подсказка: ' + themes.slice(0, 2).join(', ') : 'Найди лучший ход';
      draw();
      api.after(600, () => { play(line[ply++]); busy = false; });
    }
    function done(ok) {
      busy = true;
      if (ok) {
        api.addScore(1); api.haptic('success');
        info.textContent = `✅ Решено! (${cur[3]})`;
        rating = Math.min(2900, rating + 100);
      } else {
        api.haptic('error');
        rating = Math.max(400, rating - 100);
      }
      api.after(ok ? 900 : 1600, load);
    }
    api.on(board, 'click', (e) => {
      const el = e.target.closest('button');
      if (!el || busy) return;
      const s = el.dataset.s, p = game.get(s);
      if (!sel) { if (p && p.color === game.turn()) { sel = s; draw(); } return; }
      if (p && p.color === game.turn()) { sel = s; draw(); return; }
      const legal = game.moves({ square: sel, verbose: true }).find((m) => m.to === s);
      if (!legal) { sel = null; draw(); return; }
      const want = line[ply];
      let uci = sel + s + (legal.promotion ? (want && want.startsWith(sel + s) ? want[4] : 'q') : '');
      sel = null;
      const last = ply === line.length - 1;
      play(uci);
      // засчитываем ход из решения или любой мат последним ходом (как на Lichess)
      if (uci.slice(0, 4) === want.slice(0, 4) || (last && game.in_checkmate())) {
        ply++;
        if (ply >= line.length) return done(true);
        busy = true;
        api.after(450, () => { play(line[ply++]); busy = false; if (ply >= line.length) done(true); });
      } else {
        api.shake(board);
        info.textContent = `❌ Лучше было ${want.slice(0, 2)}→${want.slice(2, 4)}`;
        done(false);
      }
    });
    load();
  }

  const def = { howto: 'Шахматные задачи из открытой базы Lichess. Тапни фигуру, потом клетку. Найди лучший ход (часто — серию ходов). Решил — следующая сложнее, ошибся — проще. 5 минут, очки — решённые задачи.', start: null };
  Promise.all([
    new Promise((ok, fail) => { if (window.Chess) return ok(); const s = document.createElement('script'); s.src = 'vendor/chess.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }),
    fetch('games/data/chess.json').then((r) => r.json()),
  ]).then(([, data]) => { def.start = (api) => start(api, data); Arcade.register(def); })
    .catch(() => Arcade.fail('Не удалось загрузить шахматные задачи. Проверь связь и открой игру заново.'));
})();
