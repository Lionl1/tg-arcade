// N-назад — классическая тренировка рабочей памяти
Arcade.register({
  howto: 'Клетки загораются по одной. Жми «Совпало» (или пробел), если клетка та же, что N шагов назад. Каждые 15 шагов N растёт, очки за совпадение = N. Пропуск или ложное нажатие — минус жизнь, всего 3.',
  start(api) {
    const BLOCK = 15;
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const grid = api.el('div', 'grid g3', box);
    grid.style.maxWidth = 'min(80vw, 46vh)';
    const cells = [...Array(9)].map(() => api.el('div', 'tile', grid));
    const btn = api.el('button', 'btn', box, 'Совпало!');
    btn.style.cssText = 'flex:none;width:min(80vw,320px);padding:18px;font-size:20px';
    let n = 1, seq = [], step = 0, pressed = false, lives = 3, active = false;

    const isMatch = () => seq.length > n && seq[seq.length - 1] === seq[seq.length - 1 - n];
    const draw = (msg) => { info.textContent = msg || `N = ${n} · шаг ${step}/${BLOCK} · ${'❤️'.repeat(lives)}`; };
    const flash = (c) => { btn.style.background = c; api.after(220, () => { btn.style.background = ''; }); };
    function lose(msg) {
      lives--; api.haptic('error'); draw(msg + ' ' + '❤️'.repeat(Math.max(0, lives)));
      if (lives <= 0) { active = false; api.after(700, () => api.end()); }
    }

    function next() {
      if (lives <= 0) return;
      if (active && isMatch() && !pressed) { lose('Пропущено совпадение!'); if (lives <= 0) return; }
      if (step >= BLOCK) {
        n++; seq = []; step = 0; active = false;
        draw(`Отлично! Теперь N = ${n}`); api.haptic('success');
        return api.after(1600, next);
      }
      const back = seq.length >= n ? seq[seq.length - n] : -1;
      let pos;
      if (back >= 0 && api.rand() < 0.33) pos = back;
      else do pos = api.randi(9); while (pos === back);
      seq.push(pos); step++; pressed = false; active = true;
      if (!info.textContent.includes('!')) draw();
      else api.after(900, () => draw());
      cells[pos].style.background = 'var(--accent)';
      api.after(550, () => { cells[pos].style.background = ''; });
      api.after(Math.max(1400, 2100 - n * 120), next);
    }
    function press() {
      if (!active || pressed) return;
      pressed = true;
      if (isMatch()) { api.addScore(n); api.haptic('light'); flash('var(--good)'); }
      else { flash('var(--bad)'); lose('Совпадения не было.'); }
    }
    api.on(btn, 'pointerdown', press);
    api.on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); press(); } });
    draw('Приготовься: сначала N = 1');
    api.after(1200, next);
  },
});
