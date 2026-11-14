// ЕГЭ математика: производная и прогрессии
Arcade.register(Learn.deck({
  ask: L('Найдите', 'Find'),
  howto: L('Производная многочлена в точке, члены и суммы прогрессий. 90 секунд, ошибка −3 с.', 'The derivative of a polynomial at a point, terms and sums of sequences. 90 seconds, a mistake costs 3 s.'),
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const near = (v) => Learn.nearNumbers(api, v, 3, Math.max(3, Math.round(Math.abs(v) * 0.2)));
    // многочлен без «+ 0x»: пропускаем нулевые члены
    const term = (k, s, first) => (k === 0 ? '' : `${k < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${Math.abs(k) === 1 && s ? '' : Math.abs(k)}${s}`);
    const poly = (a, b, c) => (term(a, 'x²', true) + term(b, 'x', false) + term(c, '', false)) || '0';
    const withNear = (v, list) => [...new Set(list.concat([v + 1, v - 1, v + 2]))].filter((w) => w !== v);
    const t = api.randi(4);
    if (t === 0) { const a = R(1, 4), b = R(-6, 6), c = R(-9, 9), x = R(-3, 3); const v = 2 * a * x + b; return { q: `f(x) = ${poly(a, b, c)}\nf′(${x}) = ?`, a: v, wrong: withNear(v, [a * x * x + b * x + c, 2 * a * x, a * x + b]) }; }
    if (t === 1) { const a = R(1, 3), x = R(-2, 3); const v = 3 * a * x * x; return { q: `f(x) = ${a === 1 ? '' : a}x³ − 7\nf′(${x}) = ?`, a: v, wrong: withNear(v, [a * x ** 3 - 7, 3 * a * x, a * x * x]) }; }
    if (t === 2) { const a1 = R(-5, 10), d = R(-4, 6) || 2, n = R(5, 15); const v = a1 + (n - 1) * d; return { q: L(`Арифметическая прогрессия: a₁ = ${a1}, d = ${d}. Найдите a${n}`, `Arithmetic sequence: a₁ = ${a1}, d = ${d}. Find a${n}`), a: v, wrong: [a1 + n * d, a1 * n * d, v - d * 2].filter((w) => w !== v) }; }
    const b1 = R(1, 5), q = api.pick([2, 3, -2]), n = R(3, 6); const v = b1 * q ** (n - 1);
    return { q: L(`Геометрическая прогрессия: b₁ = ${b1}, q = ${q}. Найдите b${n}`, `Geometric sequence: b₁ = ${b1}, r = ${q}. Find b${n}`), a: v, wrong: [b1 * q ** n, b1 * q * (n - 1), -v].filter((w) => w !== v) };
  },
}));
