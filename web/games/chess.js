// Шахматные задачи из открытой базы Lichess (CC0). Правила ходов — chess.js (BSD-2).
// Рейтинг задач подстраивается: решил — следующая сложнее, ошибся — проще.
(() => {
  const THEMES = LANG === 'en' ? { mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3', mateIn4: 'Mate in 4', fork: 'fork', pin: 'pin',
    skewer: 'skewer', hangingPiece: 'hanging piece', discoveredAttack: 'discovered attack', sacrifice: 'sacrifice', promotion: 'promotion',
    endgame: 'endgame', middlegame: 'middlegame', opening: 'opening', backRankMate: 'back-rank mate', deflection: 'deflection', trappedPiece: 'trapped piece' } : { mateIn1: 'Мат в 1 ход', mateIn2: 'Мат в 2 хода', mateIn3: 'Мат в 3 хода', mateIn4: 'Мат в 4 хода', fork: 'вилка', pin: 'связка',
    skewer: 'сквозной удар', hangingPiece: 'незащищённая фигура', discoveredAttack: 'вскрытое нападение', sacrifice: 'жертва', promotion: 'превращение пешки',
    endgame: 'эндшпиль', middlegame: 'миттельшпиль', opening: 'дебют', backRankMate: 'мат по последней горизонтали', deflection: 'отвлечение', trappedPiece: 'ловля фигуры' };
  // Фигуры — классический набор Cburnett (Colin M.L. Burnett, BSD/GPL/GFDL), как на Lichess и в Википедии
  const PIECE = (p) => `vendor/pieces/${p.color}${p.type.toUpperCase()}.svg`;
  for (const c of 'wb') for (const t of 'kqrbnp') new Image().src = PIECE({ color: c, type: t }); // заранее, чтобы доска не мигала

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
      b.style.cssText = `width:${S}px;height:${S}px;border:0;padding:0;display:flex;align-items:center;justify-content:center;position:relative`;
      const img = api.el('img', '', b);
      img.draggable = false;
      img.style.cssText = 'width:92%;height:92%;pointer-events:none;-webkit-user-drag:none';
      const dot = api.el('span', '', b); // куда можно пойти выбранной фигурой
      dot.style.cssText = 'position:absolute;inset:0;margin:auto;pointer-events:none;border-radius:50%';
      const file = api.el('span', '', b), rank = api.el('span', '', b); // координаты a–h, 1–8
      const lab = `position:absolute;font:700 ${Math.max(9, S * 0.2)}px system-ui;pointer-events:none;opacity:.85`;
      file.style.cssText = lab + ';right:2px;bottom:0';
      rank.style.cssText = lab + ';left:2px;top:1px';
      b._p = { img, dot, file, rank };
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
      const targets = sel ? game.moves({ square: sel, verbose: true }) : [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const s = name(r, c), el = sq[idx(s)], p = b[r][c];
        const light = (r + c) % 2 === 0;
        el.style.background = hl.includes(s) ? (light ? '#f6f669' : '#baca2b') : light ? '#f0d9b5' : '#b58863';
        if (sel === s) el.style.background = '#7fc97f';
        const { img, dot, file, rank } = el._p;
        if (p) { const src = PIECE(p); if (img.getAttribute('src') !== src) img.src = src; img.hidden = false; } else img.hidden = true;
        const t = targets.find((m) => m.to === s);
        dot.style.width = dot.style.height = t ? (p ? '86%' : '30%') : '0';
        dot.style.background = t && !p ? 'rgba(20,85,30,.45)' : 'transparent';
        dot.style.boxShadow = t && p ? 'inset 0 0 0 4px rgba(20,85,30,.55)' : 'none';
        const k = idx(s), labColor = light ? '#b58863' : '#f0d9b5';
        file.textContent = k >= 56 ? s[0] : ''; rank.textContent = k % 8 === 0 ? s[1] : '';
        file.style.color = rank.style.color = labColor;
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
      info.textContent = L(`Рейтинг задачи ${cur[3]} · играешь ${white ? 'белыми' : 'чёрными'}`, `Puzzle rating ${cur[3]} · you play ${white ? 'White' : 'Black'}`);
      note.textContent = themes.length ? L('Подсказка: ', 'Hint: ') + themes.slice(0, 2).join(', ') : L('Найди лучший ход', 'Find the best move');
      draw();
      api.after(600, () => { play(line[ply++]); busy = false; });
    }
    function done(ok) {
      busy = true;
      if (ok) {
        api.addScore(1); api.haptic('success');
        info.textContent = L(`✅ Решено! (${cur[3]})`, `✅ Solved! (${cur[3]})`);
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
        info.textContent = L(`❌ Лучше было ${want.slice(0, 2)}→${want.slice(2, 4)}`, `❌ Better was ${want.slice(0, 2)}→${want.slice(2, 4)}`);
        done(false);
      }
    });
    load();
  }

  const def = { howto: L('Шахматные задачи из открытой базы Lichess. Тапни фигуру, потом клетку. Найди лучший ход (часто — серию ходов). Решил — следующая сложнее, ошибся — проще. 5 минут, очки — решённые задачи.', 'Chess puzzles from the open Lichess database. Tap a piece, then a square. Find the best move (often a series of moves). Solve one and the next is harder; miss and it gets easier. 5 minutes, points = puzzles solved.'), start: null };
  Promise.all([
    new Promise((ok, fail) => { if (window.Chess) return ok(); const s = document.createElement('script'); s.src = 'vendor/chess.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }),
    fetch('games/data/chess.json').then((r) => r.json()),
  ]).then(([, data]) => { def.start = (api) => start(api, data); Arcade.register(def); })
    .catch(() => Arcade.fail(L('Не удалось загрузить шахматные задачи. Проверь связь и открой игру заново.', "Couldn't load the chess puzzles. Check your connection and reopen the game.")));
})();
