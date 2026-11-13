Arcade.register({
  howto: 'Запомни число, пока оно на экране, и набери его. Каждый раунд на цифру длиннее. Одна ошибка — конец.',
  start(api) {
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box, 'Запоминай');
    const shown = api.el('div', '', box);
    shown.style.cssText = 'font-size:min(11vw,48px);font-weight:800;letter-spacing:4px;font-variant-numeric:tabular-nums;min-height:1.3em;word-break:break-all';
    const pad = api.el('div', 'grid g3', box);
    pad.style.maxWidth = 'min(80vw, 320px)';
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
      const b = api.el('button', 'tile', pad, k);
      b.style.cssText = 'aspect-ratio:1.4;font-size:26px' + (k ? '' : ';visibility:hidden');
      b.dataset.k = k;
    }
    let len = 3, target = '', typed = '', input = false;

    function round() {
      input = false; typed = '';
      target = String(api.randi(9) + 1);
      while (target.length < len) target += api.randi(10);
      info.textContent = 'Запоминай'; shown.textContent = target;
      api.after(800 + len * 350, () => {
        input = true; info.textContent = 'Набери число'; shown.textContent = '·'.repeat(len);
      });
    }
    function draw() { shown.textContent = typed + '·'.repeat(len - typed.length); }

    api.on(pad, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || !input || !b.dataset.k) return;
      api.haptic('select');
      if (b.dataset.k === '⌫') typed = typed.slice(0, -1);
      else typed += b.dataset.k;
      draw();
      if (typed.length < len) return;
      input = false;
      if (typed === target) {
        api.setScore(len); api.haptic('success'); info.textContent = 'Верно!';
        len++; api.after(600, round);
      } else {
        api.haptic('error'); info.textContent = 'Было: ' + target; api.shake(shown);
        api.after(1400, () => api.end());
      }
    });
    round();
  },
});
