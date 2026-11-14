Arcade.register({
  howto: L('Слово написано каким-то цветом. Жми кнопку с названием ЦВЕТА БУКВ, а не самого слова. Ошибка — минус очко и 2 секунды. 30 секунд.', 'The word is written in some colour. Tap the button naming the COLOUR OF THE LETTERS, not the word itself. A mistake costs a point and 2 seconds. 30 seconds.'),
  start(api) {
    const COLORS = [[L('красный', 'red'), '#e5534b'], [L('синий', 'blue'), '#4a90e2'], [L('зелёный', 'green'), '#3fb950'], [L('жёлтый', 'yellow'), '#e3b341'], [L('фиолетовый', 'purple'), '#a371f7'], [L('оранжевый', 'orange'), '#f0883e']];
    const box = api.el('div', 'fill');
    const word = api.el('div', '', box);
    word.style.cssText = 'font-size:46px;font-weight:900;text-transform:uppercase;letter-spacing:1px';
    const ch = api.el('div', 'choices', box);
    for (const [name] of COLORS) {
      const b = api.el('button', 'btn ghost', ch, name);
      b.style.fontSize = '18px'; b.dataset.name = name;
    }
    const tm = api.timer(30);
    let ink = '', cancelT = () => {};
    const btns = [...ch.children];

    // постепенное усложнение: сначала 4 цвета, с 8 очков — все 6; с 5 очков — лимит времени на ответ, который сокращается
    function next() {
      cancelT();
      const active = COLORS.slice(0, api.score >= 8 ? 6 : 4);
      btns.forEach((b, i) => { b.style.display = i < active.length ? '' : 'none'; });
      const w = api.pick(active);
      let c = api.pick(active);
      if (api.rand() < 0.75) while (c === w) c = api.pick(active);
      ink = c[0]; word.textContent = w[0]; word.style.color = c[1];
      if (api.score >= 5) cancelT = api.after(Math.max(1200, 3500 - (api.score - 5) * 100), () => { api.setScore(Math.max(0, api.score - 1)); tm.add(-2); api.haptic('error'); next(); });
    }
    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.name === ink) { api.addScore(1); api.haptic('light'); }
      else { api.setScore(Math.max(0, api.score - 1)); tm.add(-2); api.haptic('error'); word.classList.remove('shake'); void word.offsetWidth; word.classList.add('shake'); }
      next();
    });
    next();
  },
});
