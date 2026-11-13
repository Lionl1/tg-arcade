Arcade.register({
  howto: 'Тапай по кнопке как можно чаще. Таймер на 10 секунд стартует с первого тапа. Можно несколькими пальцами!',
  start(api) {
    const box = api.el('div', 'fill');
    const btn = api.el('button', 'btn', box, 'ТАП!');
    btn.style.cssText = 'flex:none;width:min(62vw,260px);aspect-ratio:1;border-radius:50%;font-size:40px;touch-action:none';
    const hint = api.el('div', 'hint', box, 'Таймер стартует с первого тапа');
    let started = false;

    api.on(btn, 'pointerdown', (e) => {
      e.preventDefault();
      if (!started) { started = true; hint.textContent = 'Быстрее!'; api.timer(10); }
      api.addScore(1); api.haptic('light');
      btn.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 110 });
    });
  },
});
