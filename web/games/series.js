// Продолжи ряд — поиск закономерности; новые типы рядов открываются по мере роста счёта
Arcade.register({
  howto: L('Найди закономерность и выбери следующее число. Чем больше очков, тем хитрее ряды: шаги, умножение, квадраты, чередование, суммы. Ошибка −4 с. 90 секунд.', 'Find the pattern and pick the next number. The more points, the trickier the series: steps, multiplication, squares, alternation, sums. A mistake costs 4 s. 90 seconds.'),
  start(api) {
    const R = (n) => api.randi(n);
    const GENS = [
      () => { const a = R(20) + 1, d = R(8) + 2; return (i) => a + i * d; },                         // +d
      () => { const a = R(30) + 40, d = R(6) + 2; return (i) => a - i * d; },                        // −d
      () => { const a = R(3) + 1, q = api.pick([2, 3]); return (i) => a * q ** i; },                  // ×q
      () => { const a = R(10) + 1, d = R(3) + 1, s = R(2) + 1; return (i) => a + d * i + s * i * (i - 1) / 2; }, // растущий шаг
      () => { const k = R(5) + 1; return (i) => (k + i) ** 2; },                                      // квадраты
      () => { const a = R(10) + 5, p = R(6) + 3, m = R(3) + 1; return (i) => a + Math.ceil(i / 2) * p - Math.floor(i / 2) * m; }, // +p −m
      () => { const f = [R(5) + 1, R(5) + 2]; for (let i = 2; i < 7; i++) f.push(f[i - 1] + f[i - 2]); return (i) => f[i]; }, // сумма двух
      () => { const a = R(5) + 1, b = R(20) + 20, d1 = R(4) + 2, d2 = R(4) + 1; return (i) => (i % 2 ? b - ((i - 1) / 2) * d2 : a + (i / 2) * d1); }, // два ряда
      () => { const a = R(4) + 1, k = R(2) + 2, c = R(3) + 1; const f = [a]; for (let i = 1; i < 7; i++) f.push(f[i - 1] * k - c); return (i) => f[i]; }, // ×k −c
    ];
    const box = api.el('div', 'fill');
    api.el('div', 'hint', box, L('Какое число следующее?', 'Which number comes next?'));
    const q = api.el('div', 'learn-q', box);
    q.style.fontVariantNumeric = 'tabular-nums';
    const ch = api.el('div', 'choices', box);
    const tm = api.timer(90);
    let ans = 0;

    function next() {
      const unlocked = Math.min(GENS.length, 3 + Math.floor(api.score / 2));
      let f, terms;
      do { f = api.pick(GENS.slice(0, unlocked))(); terms = [0, 1, 2, 3, 4, 5].map(f); }
      while (terms.some((v) => !Number.isInteger(v) || v < 0 || v > 999));
      ans = terms[5];
      q.textContent = terms.slice(0, 5).join(', ') + ', ?';
      const naive = terms[4] + (terms[4] - terms[3]);
      const opts = new Set([ans]);
      if (naive !== ans && naive >= 0) opts.add(naive);
      while (opts.size < 4) { const v = ans + api.pick([-3, -2, -1, 1, 2, 3, 4, 5]) * Math.max(1, Math.round(Math.abs(ans) / 25)); if (v >= 0) opts.add(v); }
      ch.innerHTML = '';
      for (const v of api.shuffle([...opts])) api.el('button', 'btn ghost', ch, v).dataset.v = v;
    }
    api.on(ch, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (+b.dataset.v === ans) { api.addScore(1); api.haptic('light'); }
      else { tm.add(-4); api.haptic('error'); api.shake(q); }
      next();
    });
    next();
  },
});
