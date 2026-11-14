Arcade.register({
  howto: L('Кнопки загораются по очереди — запомни порядок и повтори. Каждый раунд добавляет ещё одну.', 'Buttons light up one after another — remember the order and repeat it. Each round adds one more.'),
  chapters: {
    2: L('шесть кнопок вместо четырёх', 'six buttons instead of four'),
    3: L('повторяй задом наперёд', 'repeat it backwards'),
    4: L('девять кнопок', 'nine buttons'),
  },
  start(api) {
    const ch = api.chapter, back = ch === 3 || (ch >= 5 && api.rand() < 0.5);
    const ALL = [['#e5534b', 330], ['#3fb950', 440], ['#4a90e2', 550], ['#e3b341', 660], ['#a371f7', 740], ['#f0883e', 830], ['#39c5cf', 880], ['#db61a2', 990], ['#8b949e', 1100]];
    const PADS = ALL.slice(0, ch >= 4 ? 9 : ch >= 2 ? 6 : 4);
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box, L('Смотри…', 'Watch…'));
    const grid = api.el('div', 'grid', box);
    grid.style.cssText = `grid-template-columns:repeat(${PADS.length > 4 ? 3 : 2},1fr);max-width:min(86vw,50vh)`;
    const pads = PADS.map(([c], i) => {
      const p = api.el('button', 'tile', grid);
      p.style.cssText = `background:${c};opacity:.35;transition:opacity .12s`;
      p.dataset.i = i;
      return p;
    });
    const seq = [];
    let pos = 0, input = false;

    function light(i, ms) {
      pads[i].style.opacity = '1'; api.tone(PADS[i][1], ms, 'triangle');
      api.after(ms, () => { pads[i].style.opacity = '.35'; });
    }
    function play() {
      input = false; info.textContent = L('Смотри…', 'Watch…');
      seq.push(api.randi(PADS.length));
      const on = Math.max(220, 480 - seq.length * 18), gap = 140;
      seq.forEach((p, k) => api.after(500 + k * (on + gap), () => light(p, on)));
      api.after(500 + seq.length * (on + gap), () => { input = true; pos = 0; info.textContent = back ? L('Повтори задом наперёд!', 'Repeat backwards!') : L('Повтори!', 'Repeat!'); });
    }
    api.on(grid, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || !input) return;
      const i = +b.dataset.i;
      light(i, 180); api.haptic('select');
      if (i !== (back ? seq[seq.length - 1 - pos] : seq[pos])) { input = false; api.haptic('error'); info.textContent = L('Мимо!', 'Wrong!'); api.after(500, () => api.end()); return; }
      if (++pos === seq.length) { api.setScore(seq.length); input = false; info.textContent = L('Верно!', 'Correct!'); api.after(500, play); }
    });
    play();
  },
});
