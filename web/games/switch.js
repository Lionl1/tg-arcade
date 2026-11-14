// Переключение задач: правило зависит от того, где появилось число
Arcade.register({
  howto: L('Число появляется в верхней или нижней панели. Сверху отвечай: «чётное?». Снизу: «больше 5?». Правило меняется на лету — тренирует гибкость мышления. Ошибка −2 с. 45 секунд.', 'A number appears in the top or bottom panel. Top: answer “even?”. Bottom: “greater than 5?”. The rule changes on the fly — this trains mental flexibility. A mistake costs 2 s. 45 seconds.'),
  start(api) {
    const box = api.el('div', 'fill');
    box.style.gap = '10px';
    const mk = (label) => {
      const p = api.el('div', 'flash', box);
      p.style.cssText += ';min-height:min(26vh,170px);cursor:default;gap:4px';
      api.el('div', 'hint', p, label);
      const v = api.el('div', 'learn-q big', p);
      v.style.fontSize = 'min(18vw,80px)';
      return v;
    };
    const top = mk(L('Сверху: число ЧЁТНОЕ?', 'Top: is the number EVEN?'));
    const bot = mk(L('Снизу: число БОЛЬШЕ 5?', 'Bottom: is the number GREATER THAN 5?'));
    const ch = api.el('div', 'choices', box);
    const no = api.el('button', 'btn ghost', ch, L('Нет', 'No'));
    const yes = api.el('button', 'btn', ch, L('Да', 'Yes'));
    const tm = api.timer(45);
    let answer = false, cancelT = () => {};

    function next() {
      cancelT();
      if (api.score >= 5) cancelT = api.after(Math.max(1000, 3200 - (api.score - 5) * 90), () => { tm.add(-2); api.haptic('error'); api.shake(ch); next(); });
      const n = api.pick([1, 2, 3, 4, 6, 7, 8, 9]);
      const up = api.rand() < 0.5;
      top.textContent = up ? n : ''; bot.textContent = up ? '' : n;
      answer = up ? n % 2 === 0 : n > 5;
    }
    function choose(v) {
      if (v === answer) { api.addScore(1); api.haptic('light'); }
      else { tm.add(-2); api.haptic('error'); api.shake(ch); }
      next();
    }
    api.on(yes, 'pointerdown', () => choose(true));
    api.on(no, 'pointerdown', () => choose(false));
    api.on(window, 'keydown', (e) => {
      if (e.code === 'ArrowLeft') choose(false);
      if (e.code === 'ArrowRight') choose(true);
    });
    next();
  },
});
