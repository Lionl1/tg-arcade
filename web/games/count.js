Arcade.register({
  howto: 'Точки появятся на мгновение. Сколько их было? Ошибка — минус жизнь, всего 3.',
  start(api) {
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box, '❤️❤️❤️');
    const field = api.el('div', '', box);
    field.style.cssText = 'position:relative;width:min(88vw,360px);aspect-ratio:1;border-radius:18px;background:var(--card)';
    const ch = api.el('div', 'choices', box);
    let lives = 3, answer = 0, input = false;

    function round() {
      input = false; ch.innerHTML = ''; field.innerHTML = '';
      answer = api.randi(5 + Math.min(12, api.score)) + 4;
      const pts = [];
      while (pts.length < answer) {
        const p = [api.rand(8, 92), api.rand(8, 92)];
        if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 11)) pts.push(p);
      }
      for (const [px, py] of pts) {
        const d = api.el('span', '', field);
        d.style.cssText = `position:absolute;left:${px}%;top:${py}%;width:16px;height:16px;margin:-8px;border-radius:50%;background:var(--fg)`;
      }
      api.after(Math.max(450, 900 - api.score * 25), () => {
        field.innerHTML = '';
        const opts = new Set([answer]);
        while (opts.size < 4) { const v = answer + api.pick([-3, -2, -1, 1, 2, 3]); if (v > 0) opts.add(v); }
        for (const v of [...opts].sort((a, b) => a - b)) api.el('button', 'btn', ch, v).dataset.v = v;
        input = true;
      });
    }
    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || !input) return;
      input = false;
      if (+b.dataset.v === answer) { api.addScore(1); api.haptic('light'); }
      else {
        lives--; api.haptic('error'); info.textContent = (lives > 0 ? '❤️'.repeat(lives) : '') + ` · было ${answer}`;
        if (lives <= 0) return api.after(900, () => api.end());
      }
      api.after(400, round);
    });
    round();
  },
});
