// Двойной N-назад: одновременно помни МЕСТО и БУКВУ — классический тренажёр рабочей памяти (dual n-back)
Arcade.register({
  howto: 'В клетке появляется буква. Жми «📍 Место», если клетка та же, что N шагов назад, и «🔤 Буква», если та же буква. Бывает и то и другое сразу. Каждые 20 шагов N растёт. Очки за совпадение = N, ошибка — минус жизнь (их 3).',
  start(api) {
    const BLOCK = 20, LET = 'КЛМНПРСТ';
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const grid = api.el('div', 'grid g3', box);
    grid.style.maxWidth = 'min(76vw, 42vh)';
    const cells = [...Array(9)].map(() => { const c = api.el('div', 'tile', grid); c.style.fontSize = 'min(9vw,40px)'; return c; });
    const row = api.el('div', 'row', box);
    row.style.width = 'min(90vw,360px)';
    const bPos = api.el('button', 'btn', row, '📍 Место');
    const bLet = api.el('button', 'btn', row, '🔤 Буква');
    let n = Math.max(1, Math.min(4, 1 + Math.floor((api.level || 0) / 5))), seq = [], step = 0, lives = 3, active = false, pressed = { p: false, l: false };

    const match = (k) => seq.length > n && seq[seq.length - 1][k] === seq[seq.length - 1 - n][k];
    const draw = (msg) => { info.textContent = msg || `N = ${n} · шаг ${step}/${BLOCK} · ${'❤️'.repeat(Math.max(0, lives))}`; };
    function lose(msg) { lives--; api.haptic('error'); draw(msg); if (lives <= 0) { active = false; api.after(700, () => api.end()); } }
    function next() {
      if (lives <= 0) return;
      if (active) {
        if (match('p') && !pressed.p) lose('Пропущено совпадение места');
        if (lives > 0 && match('l') && !pressed.l) lose('Пропущено совпадение буквы');
        if (lives <= 0) return;
      }
      if (step >= BLOCK) { n++; seq = []; step = 0; active = false; draw(`Отлично! Теперь N = ${n}`); api.haptic('success'); return api.after(1600, next); }
      const back = seq.length >= n ? seq[seq.length - n] : null;
      const p = back && api.rand() < 0.3 ? back.p : api.randi(9);
      const l = back && api.rand() < 0.3 ? back.l : LET[api.randi(LET.length)];
      seq.push({ p, l }); step++; pressed = { p: false, l: false }; active = true;
      draw();
      cells[p].textContent = l; cells[p].style.background = 'color-mix(in srgb, var(--accent) 45%, var(--card))';
      api.after(700, () => { cells[p].textContent = ''; cells[p].style.background = ''; });
      api.after(Math.max(1700, 2600 - n * 150), next);
    }
    function press(k, btn) {
      if (!active || pressed[k]) return;
      pressed[k] = true;
      if (match(k)) { api.addScore(n); api.haptic('light'); btn.style.background = 'var(--good)'; }
      else { btn.style.background = 'var(--bad)'; lose(k === 'p' ? 'Место не совпадало' : 'Буква не совпадала'); }
      api.after(220, () => { btn.style.background = ''; });
    }
    api.on(bPos, 'pointerdown', () => press('p', bPos));
    api.on(bLet, 'pointerdown', () => press('l', bLet));
    api.on(window, 'keydown', (e) => { if (e.code === 'KeyA') press('p', bPos); if (e.code === 'KeyL') press('l', bLet); });
    draw('Приготовься…');
    api.after(1200, next);
  },
});
