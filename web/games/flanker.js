// Стрелки (фланговая задача): игнорировать соседей, со временем — правило-перевёртыш
Arcade.register({
  howto: L('Куда смотрит СРЕДНЯЯ стрелка? Тапни левую или правую половину экрана (или ←/→). Соседи сбивают с толку. С 10 очков появятся оранжевые стрелки — для них отвечай наоборот! Ошибка −2 с. 45 секунд.', 'Which way does the MIDDLE arrow point? Tap the left or right half of the screen (or ←/→). The neighbours try to fool you. From 10 points orange arrows appear — answer the opposite for them! A mistake costs 2 s. 45 seconds.'),
  start(api) {
    const box = api.el('div', 'fill');
    const rule = api.el('div', 'hint', box, L('Средняя стрелка', 'Middle arrow'));
    const row = api.el('div', '', box);
    row.style.cssText = 'font-size:min(14vw,64px);font-weight:900;letter-spacing:6px;white-space:nowrap';
    const hints = api.el('div', 'row', box);
    hints.style.cssText = 'width:100%;max-width:420px;position:absolute;bottom:24px;left:50%;transform:translateX(-50%);padding:0 16px';
    api.el('div', 'btn ghost', hints, '←');
    api.el('div', 'btn ghost', hints, '→');
    const tm = api.timer(45);
    let answer = 'L';

    function next() {
      const target = api.rand() < 0.5 ? 'L' : 'R';
      const flank = api.rand() < 0.4 ? target : (target === 'L' ? 'R' : 'L');
      const invert = api.score >= 10 && api.rand() < 0.35;
      const ch = (d) => (d === 'L' ? '←' : '→');
      const len = api.score >= 20 ? 7 : 5, mid = len >> 1;
      row.textContent = [...Array(len)].map((_, i) => ch(i === mid ? target : flank)).join('');
      row.style.color = invert ? 'var(--warn)' : 'var(--accent)';
      rule.textContent = invert ? L('Оранжевые: отвечай НАОБОРОТ', 'Orange: answer the OPPOSITE') : L('Куда смотрит средняя стрелка?', 'Which way does the middle arrow point?');
      answer = invert ? (target === 'L' ? 'R' : 'L') : target;
    }
    function choose(d) {
      if (d === answer) { api.addScore(1); api.haptic('light'); }
      else { tm.add(-2); api.haptic('error'); api.shake(row); }
      next();
    }
    api.onTap((x) => choose(x < api.W / 2 ? 'L' : 'R'));
    api.on(window, 'keydown', (e) => {
      if (e.code === 'ArrowLeft') choose('L');
      if (e.code === 'ArrowRight') choose('R');
    });
    next();
  },
});
