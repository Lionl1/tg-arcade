// ЕГЭ математика: степени и логарифмы
Arcade.register(Learn.deck({
  ask: 'Найдите значение выражения',
  howto: 'Свойства логарифмов и степеней. 90 секунд, ошибка −3 с.',
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const near = (v) => Learn.nearNumbers(api, v, 3, 3);
    const b = api.pick([2, 3, 5]);
    const t = api.randi(6);
    if (t === 0) { const k = R(2, 6); return { q: `log${b} ${b ** k}`, a: k, wrong: near(k) }; }
    if (t === 1) { const x = R(1, 3), y = R(1, 3); return { q: `log${b} ${b ** x * 2} − log${b} 2 + log${b} ${b ** y}`, a: x + y, wrong: near(x + y) }; }
    if (t === 2) { const n = R(3, 40); return { q: `${b}^(log${b} ${n})`, a: n, wrong: [b * n, n + b, b ** 2].filter((w) => w !== n) }; }
    if (t === 3) { const k = R(2, 4), m = R(2, 3); return { q: `log${b ** m} ${b ** (k * m)}`, a: k, wrong: [k * m, m, k + m].filter((w) => w !== k) }; }
    if (t === 4) { const p = R(2, 4), q = R(2, 3); return { q: `(${b}^${p})^${q} : ${b}^${p * q - 1}`, a: b, wrong: [b * b, 1, b ** p].filter((w) => w !== b) }; }
    const n = R(2, 3); return { q: `lg 10^${n} + lg 0,1`, a: n - 1, wrong: [n, n + 1, -n].filter((w) => w !== n - 1) };
  },
}));
