// Ханойская башня — планирование на несколько ходов вперёд
Arcade.register({
  howto: 'Перенеси всю башню на правый стержень. Тапни стержень, откуда взять верхний диск, потом — куда положить. Больший диск нельзя класть на меньший. Каждая башня на диск выше. Очки = диски собранных башен, ×2 за минимальное число ходов. 3 минуты.',
  start(api) {
    const box = api.el('div', 'fill');
    const info = api.el('div', 'hint', box);
    const field = api.el('div', '', box);
    field.style.cssText = 'display:flex;gap:8px;width:min(94vw,480px);height:min(46vh,300px);align-items:stretch';
    const pegEls = [0, 1, 2].map((i) => {
      const p = api.el('button', '', field);
      p.style.cssText = 'flex:1;border:0;border-radius:14px;background:var(--card);display:flex;flex-direction:column-reverse;align-items:center;padding:10px 4px;gap:4px;position:relative';
      p.dataset.i = i;
      return p;
    });
    api.timer(180);
    let n = 3, pegs, moves, sel = null, lock = false;

    function reset() {
      pegs = [[...Array(n)].map((_, i) => n - i), [], []];
      moves = 0; sel = null; lock = false; draw();
    }
    function draw() {
      info.textContent = `Дисков: ${n} · ходов: ${moves} (минимум ${2 ** n - 1})`;
      pegEls.forEach((p, i) => {
        p.innerHTML = '';
        p.style.outline = sel === i ? '3px solid var(--accent)' : '';
        p.style.background = i === 2 ? 'color-mix(in srgb, var(--good) 14%, var(--card))' : 'var(--card)';
        for (const d of pegs[i]) {
          const el = document.createElement('div');
          el.style.cssText = `height:${Math.min(26, 220 / n)}px;width:${25 + (d / n) * 70}%;border-radius:8px;background:hsl(${d * 47} 65% 55%)`;
          p.appendChild(el);
        }
      });
    }
    api.on(field, 'pointerdown', (e) => {
      const p = e.target.closest('button');
      if (!p || lock) return;
      const i = +p.dataset.i;
      if (sel === null) { if (pegs[i].length) { sel = i; api.haptic('select'); } }
      else if (sel === i) sel = null;
      else {
        const from = pegs[sel], to = pegs[i];
        if (to.length && to[to.length - 1] < from[from.length - 1]) { api.haptic('error'); api.shake(p); }
        else { to.push(from.pop()); moves++; api.haptic('light'); }
        sel = null;
      }
      draw();
      if (pegs[2].length === n) {
        lock = true;
        const perfect = moves === 2 ** n - 1;
        api.addScore(perfect ? n * 2 : n); api.haptic('success'); api.tone(990, 120);
        info.textContent = perfect ? '🏆 Идеально — минимум ходов!' : 'Башня собрана!';
        n = Math.min(8, n + 1);
        api.after(900, reset);
      }
    });
    reset();
  },
});
