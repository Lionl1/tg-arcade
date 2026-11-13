Arcade.register({
  howto: 'Тапай по левой или правой половине (или стрелки), чтобы отправить картинку в нужную категорию. Ошибка — минус 2 секунды.',
  start(api) {
    const SETS = [
      [['🍎 Фрукты', '🍎🍐🍊🍋🍌🍉🍇🍓🍒🍑🥭🍍🥝'], ['🥕 Овощи', '🥕🥦🥒🌽🍆🥔🧅🧄🌶️🥬']],
      [['🌍 Суша', '🐘🦒🐄🐎🦊🐻🐇🦁🐫🐒'], ['🌊 Вода', '🐟🐬🐙🦈🐳🦀🦑🐡🐠🦐']],
      [['🍽 Едят', '🍞🧀🍕🍰🥚🍔🍪🍩🥨🍜'], ['🚫 Не едят', '🧦🔑📎🧱👟🔨📱🧸🎈🪁']],
      [['☀️ Лето', '🏖️🍉🩳🕶️🌻🍦🏄⛱️'], ['❄️ Зима', '⛄🎿🧣🧤🛷🎄⛸️🥶']],
    ];
    const split = (s) => Array.from(new Intl.Segmenter().segment(s), (p) => p.segment);
    const [L, R] = api.pick(SETS).map(([name, s]) => ({ name, items: split(s) }));

    const box = api.el('div', 'fill');
    const card = api.el('div', 'tile', box);
    card.style.cssText = 'width:min(46vw,190px);font-size:min(24vw,96px);transition:transform .12s,opacity .12s';
    const row = api.el('div', 'row', box);
    row.style.cssText = 'width:100%;max-width:420px;position:absolute;bottom:24px;left:50%;transform:translateX(-50%);padding:0 16px';
    api.el('div', 'btn ghost', row, '← ' + L.name);
    api.el('div', 'btn ghost', row, R.name + ' →');
    const tm = api.timer(30);
    let side = 0, cancelT = () => {};

    function next() {
      cancelT();
      // с 5 очков — лимит на каждую картинку, всё короче
      if (api.score >= 5) cancelT = api.after(Math.max(900, 3000 - (api.score - 5) * 90), () => { tm.add(-2); api.haptic('error'); api.shake(card); next(); });
      side = api.rand() < 0.5 ? 0 : 1;
      card.textContent = api.pick((side ? R : L).items);
      card.style.transform = ''; card.style.opacity = '1';
    }
    function choose(s) {
      if (s === side) {
        cancelT(); // иначе старый дедлайн мог сработать за 110 мс до следующей карточки
        api.addScore(1); api.haptic('light');
        card.style.transform = `translateX(${s ? 60 : -60}px)`; card.style.opacity = '0';
        api.after(110, next);
      } else { tm.add(-2); api.haptic('error'); api.shake(card); }
    }
    api.onTap((px) => choose(px < api.W / 2 ? 0 : 1));
    api.on(window, 'keydown', (e) => {
      if (e.code === 'ArrowLeft') choose(0);
      if (e.code === 'ArrowRight') choose(1);
    });
    next();
  },
});
