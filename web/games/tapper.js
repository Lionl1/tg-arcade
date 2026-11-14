Arcade.register({
  howto: L('Тапай по кнопке как можно чаще. Таймер на 10 секунд стартует с первого тапа. Можно несколькими пальцами!', 'Tap the button as fast as you can. The 10-second timer starts with your first tap. Several fingers allowed!'),
  start(api) {
    const box = api.el('div', 'fill');
    const btn = api.el('button', 'btn', box, L('ТАП!', 'TAP!'));
    btn.style.cssText = 'flex:none;width:min(62vw,260px);aspect-ratio:1;border-radius:50%;font-size:40px;touch-action:none';
    const hint = api.el('div', 'hint', box, L('Таймер стартует с первого тапа', 'The timer starts with your first tap'));
    let started = false;

    api.on(btn, 'pointerdown', (e) => {
      e.preventDefault();
      if (!started) { started = true; hint.textContent = L('Быстрее!', 'Faster!'); api.timer(10); }
      api.addScore(1); api.haptic('light');
      btn.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 110 });
    });
  },
});
