// ЕГЭ математика: уравнения (линейные, квадратные, показательные, логарифмические)
Arcade.register(Learn.deck({
  ask: 'Решите уравнение',
  howto: 'Уравнения из первой части ЕГЭ. Для квадратного — указан, какой корень нужен. 90 секунд, ошибка −3 с.',
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const near = (v) => Learn.nearNumbers(api, v, 3, 4);
    const t = api.randi(api.score >= 5 || (api.level || 0) >= 5 ? 5 : 3);
    if (t === 0) { const x = R(-9, 12), a = api.pick([2, 3, 4, 5, -2, -3]), b = R(-15, 15); return { q: `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${a * x + b}`, a: x, wrong: near(x) }; }
    if (t === 1) { const x1 = R(-8, 8), x2 = R(-8, 8); const s = -(x1 + x2), p = x1 * x2; if (x1 === x2) return { q: `x² ${s < 0 ? '−' : '+'} ${Math.abs(s)}x ${p < 0 ? '−' : '+'} ${Math.abs(p)} = 0`, a: x1, wrong: near(x1) }; const big = Math.max(x1, x2); return { q: `x² ${s < 0 ? '−' : '+'} ${Math.abs(s)}x ${p < 0 ? '−' : '+'} ${Math.abs(p)} = 0\nВ ответе укажите больший корень`, a: big, wrong: [Math.min(x1, x2), -big, big + 1].filter((w) => w !== big) }; }
    if (t === 2) { const x = R(-3, 6), k = R(-3, 3), b = api.pick([2, 3, 5]); return { q: `${b}^(x ${k < 0 ? '−' : '+'} ${Math.abs(k)}) = ${b ** (x + k) >= 1 ? b ** (x + k) : '1/' + b ** -(x + k)}`, a: x, wrong: near(x) }; }
    if (t === 3) { const b = api.pick([2, 3, 5]), m = R(1, 4), k = R(-6, 6), x = b ** m - k; return { q: `log${b}(x ${k < 0 ? '−' : '+'} ${Math.abs(k)}) = ${m}`, a: x, wrong: [m - k, b * m - k, x + b].filter((w) => w !== x) }; }
    const x = R(1, 9), a = R(2, 5), b = R(1, 9); // √(ax + b) = c
    const c2 = a * x + b, c = Math.round(Math.sqrt(c2));
    if (c * c !== c2) { const y = R(2, 9); return { q: `√(x + ${y * y - x}) = ${y}`, a: x, wrong: near(x) }; }
    return { q: `√(${a}x + ${b}) = ${c}`, a: x, wrong: near(x) };
  },
}));
