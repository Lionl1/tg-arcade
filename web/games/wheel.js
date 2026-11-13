// Колесо выбора: варианты по строкам, результат выбирает сервер (честно), бот объявляет его в чате
Arcade.register({
  app: true,
  start(api) {
    const box = api.el('div', 'appbox');
    const title = api.el('input', '', box); title.type = 'text'; title.placeholder = 'Вопрос, например: Куда идём?'; title.maxLength = 60;
    const ta = api.el('textarea', '', box);
    ta.value = 'Пицца\nСуши\nБургеры\nШаурма\nГотовим сами';
    const cv = api.el('canvas', '', box);
    cv.width = cv.height = 640;
    cv.style.cssText = 'width:min(100%,42vh);aspect-ratio:1;align-self:center';
    const ctx = cv.getContext('2d');
    const spin = api.el('button', 'btn', box, '🎡 Крутить');
    const res = api.el('div', 'learn-q', box); res.style.textAlign = 'center';
    let angle = 0, busy = false;
    const items = () => ta.value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 24);

    function draw() {
      const it = items(), n = Math.max(1, it.length), c = 320, R = 300;
      ctx.clearRect(0, 0, 640, 640);
      it.forEach((label, i) => {
        const a0 = angle + (i / n) * Math.PI * 2, a1 = angle + ((i + 1) / n) * Math.PI * 2;
        ctx.fillStyle = api.colors.palette[i % 8];
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, R, a0, a1); ctx.fill();
        ctx.save(); ctx.translate(c, c); ctx.rotate((a0 + a1) / 2);
        ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(18, 34 - n)}px system-ui`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(label.length > 18 ? label.slice(0, 17) + '…' : label, R - 18, 0);
        ctx.restore();
      });
      ctx.fillStyle = api.colors.fg; ctx.beginPath(); ctx.moveTo(c + R + 6, c); ctx.lineTo(c + R + 40, c - 18); ctx.lineTo(c + R + 40, c + 18); ctx.fill(); // стрелка справа
      ctx.fillStyle = api.colors.card; ctx.beginPath(); ctx.arc(c, c, 34, 0, 7); ctx.fill();
    }
    function animateTo(index, n) {
      // стрелка смотрит на угол 0: нужно, чтобы центр сектора index оказался там
      const target = -((index + 0.5) / n) * Math.PI * 2;
      const TAU = Math.PI * 2, from = angle;
      const to = target + TAU * Math.floor((from - TAU * 5 - target) / TAU); // ≥5 оборотов назад и точно на нужный сектор
      const t0 = performance.now(), dur = 3200;
      return new Promise((done) => {
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          angle = from + (to - from) * e; draw();
          if (k < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
    }
    api.on(ta, 'input', draw);
    api.on(spin, 'click', async () => {
      const it = items();
      if (busy || it.length < 2) { if (it.length < 2) api.toast('Нужно хотя бы 2 варианта'); return; }
      busy = true; spin.disabled = true; res.textContent = '';
      const q = title.value.trim();
      let index;
      try {
        const d = await api.roll({ kind: 'pick', items: it, post: true });
        index = d.index;
        if (d.sent) api.toast(d.group ? 'Результат отправлен в чат' : 'Результат отправлен в личку');
      } catch (e) { index = api.randi(it.length); api.toast(e.message); }
      api.haptic('medium');
      await animateTo(index, it.length);
      res.textContent = (q ? q + ' → ' : '') + it[index];
      api.haptic('success'); api.tone(880, 150);
      busy = false; spin.disabled = false;
    });
    draw();
  },
});
