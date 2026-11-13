Arcade.register({
  howto: 'Бей хомяков 🐹 (+1), не трогай бомбы 💣 (−3). Чем дальше, тем быстрее. 30 секунд.',
  start(api) {
    const box = api.el('div', 'fill');
    const grid = api.el('div', 'grid g3', box);
    const holes = [], state = [];
    for (let i = 0; i < 9; i++) {
      const h = api.el('button', 'tile', grid);
      h.style.cssText = 'font-size:min(14vw,60px);transition:transform .1s,background .15s';
      holes.push(h); state.push(null);
      api.on(h, 'pointerdown', () => hit(i));
    }
    const show = (i, emoji) => { holes[i].textContent = emoji || ''; holes[i].style.transform = emoji ? 'scale(1.04)' : ''; };
    const flash = (i, color) => { holes[i].style.background = color; api.after(160, () => { holes[i].style.background = ''; }); };

    function hit(i) {
      const s = state[i];
      if (!s) return;
      s.cancel(); state[i] = null; show(i);
      if (s.kind === 'mole') { api.addScore(1); api.haptic('light'); api.tone(700, 50); flash(i, api.colors.good); }
      else { api.setScore(Math.max(0, api.score - 3)); api.haptic('error'); flash(i, api.colors.bad); }
    }
    function pop() {
      const free = state.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
      if (free.length) {
        const i = api.pick(free), kind = api.rand() < 0.18 ? 'bomb' : 'mole';
        show(i, kind === 'mole' ? '🐹' : '💣');
        const life = Math.max(480, 1150 - api.score * 18);
        state[i] = { kind, cancel: api.after(life, () => { state[i] = null; show(i); }) };
      }
      api.after(Math.max(260, 720 - api.score * 12), pop);
    }
    api.timer(30);
    pop();
  },
});
