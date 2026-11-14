// Пробирки: рассортируй цвета так, чтобы в каждой пробирке был один цвет. Генератор строит головоломку из решённого состояния.
Arcade.register({
  howto: L('Тапни пробирку, потом другую — верхний цвет перельётся (только на такой же цвет или в пустую). Собери каждую пробирку одного цвета. Каждая решённая головоломка добавляет цвет. 3 минуты.', 'Tap a tube, then another — the top colour pours over (only onto the same colour or into an empty tube). Make every tube a single colour. Each solved puzzle adds a colour. 3 minutes.'),
  start(api) {
    const CAP = 4;
    const COLORS = ['#e5534b', '#4a90e2', '#3fb950', '#e3b341', '#a371f7', '#f0883e', '#39c5cf', '#db61a2', '#8b949e', '#7ee787', '#ffa198', '#1f6feb'];
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const field = api.el('div', '', box);
    field.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:min(94vw,520px)';
    const row = api.el('div', 'row', box);
    row.style.cssText = 'width:min(90vw,360px)';
    const undoBtn = api.el('button', 'btn ghost', row, L('↶ Ход назад', '↶ Undo'));
    const resetBtn = api.el('button', 'btn ghost', row, L('↺ Заново', '↺ Restart'));
    api.timer(180);
    let n = Math.min(9, 3 + Math.floor((api.level || 0) / 3)), tubes, start, sel = null, history = [], solved = 0;

    // обратные ходы из решённого состояния гарантируют, что решение существует
    function generate(colors) {
      const t = [...Array(colors)].map((_, i) => Array(CAP).fill(i)).concat([[], []]);
      for (let step = 0; step < colors * 40; step++) {
        const a = api.randi(t.length), b = api.randi(t.length);
        if (a === b || !t[a].length || t[b].length >= CAP) continue;
        const c = t[a][t[a].length - 1], below = t[a][t[a].length - 2];
        if (below !== undefined && below !== c) continue; // обратимо, только если прямой ход был разрешён
        t[b].push(t[a].pop());
      }
      return t;
    }
    function fresh() {
      do tubes = generate(n); while (isSolved(tubes));
      start = JSON.stringify(tubes); history = []; sel = null; draw();
    }
    const isSolved = (t) => t.every((tb) => !tb.length || (tb.length === CAP && tb.every((c) => c === tb[0])));
    function pour(a, b) {
      const A = tubes[a], B = tubes[b];
      if (!A.length || B.length >= CAP) return false;
      const c = A[A.length - 1];
      if (B.length && B[B.length - 1] !== c) return false;
      history.push(JSON.stringify(tubes));
      while (A.length && A[A.length - 1] === c && B.length < CAP) B.push(A.pop());
      return true;
    }
    function draw() {
      info.textContent = L(`Цветов: ${n} · решено: ${solved}`, `Colours: ${n} · solved: ${solved}`);
      field.innerHTML = '';
      tubes.forEach((tb, i) => {
        const el = api.el('button', '', field);
        el.dataset.i = i;
        el.style.cssText = `width:46px;height:${CAP * 34 + 14}px;border-radius:0 0 22px 22px;border:3px solid ${sel === i ? 'var(--accent)' : 'color-mix(in srgb, var(--fg) 30%, transparent)'};
          border-top:0;background:transparent;display:flex;flex-direction:column-reverse;padding:4px;gap:2px;transform:translateY(${sel === i ? -10 : 0}px);transition:transform .12s`;
        tb.forEach((c, k) => {
          const d = document.createElement('div');
          d.style.cssText = `height:32px;background:${COLORS[c]};border-radius:${k === 0 ? '0 0 16px 16px' : '3px'}`;
          el.appendChild(d);
        });
      });
    }
    api.on(field, 'pointerdown', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const i = +t.dataset.i;
      if (sel === null) { if (tubes[i].length) { sel = i; api.haptic('select'); } }
      else if (sel === i) sel = null;
      else {
        if (pour(sel, i)) { api.haptic('light'); api.tone(500 + tubes[i].length * 60, 50); } else { api.haptic('error'); api.shake(t); }
        sel = null;
      }
      draw();
      if (isSolved(tubes)) {
        solved++; api.addScore(n); api.haptic('success'); api.tone(990, 120);
        n = Math.min(COLORS.length, n + 1);
        api.after(500, fresh);
      }
    });
    api.on(undoBtn, 'click', () => { if (history.length) { tubes = JSON.parse(history.pop()); sel = null; draw(); } });
    api.on(resetBtn, 'click', () => { tubes = JSON.parse(start); history = []; sel = null; draw(); });
    fresh();
  },
});
