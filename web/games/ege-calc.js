// ЕГЭ математика: вычисления (дроби, десятичные, степени, корни). Генератор — бесконечно новых заданий.
Arcade.register(Learn.deck({
  ask: L('Найдите значение выражения', 'Evaluate the expression'),
  howto: L('Задания в духе первой части ЕГЭ: дроби, десятичные, степени, корни. Сложность растёт со счётом. 90 секунд, ошибка −3 с.', 'Exam-style arithmetic: fractions, decimals, powers, roots. Difficulty grows with your score. 90 seconds, a mistake costs 3 s.'),
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const hard = api.score >= 6 || (api.level || 0) >= 6;
    const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
    const frac = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };
    const near = (v, k = 3) => Learn.nearNumbers(api, v, k, Math.max(2, Math.round(Math.abs(v) * 0.2)));
    const t = api.randi(hard ? 6 : 4);
    if (t === 0) { // десятичные
      const a = R(11, 99) / 10, b = api.pick([2, 4, 5, 0.5, 0.2, 1.5, 2.5]);
      const v = Math.round(a * b * 100) / 100;
      const w = [v + 1, v - 0.5, Math.round(v * 10) / 100, v * 10].map((x) => Math.round(x * 100) / 100).filter((x) => x !== v && x > 0);
      return { q: `${String(a).replace('.', ',')} · ${String(b).replace('.', ',')}`, a: String(v).replace('.', ','), wrong: [...new Set(w.map((x) => String(x).replace('.', ',')))].slice(0, 3) };
    }
    if (t === 1) { // сумма дробей
      const d1 = R(2, 9), d2 = R(2, 9), n1 = R(1, d1 - 1 || 1), n2 = R(1, d2 - 1 || 1);
      const n = n1 * d2 + n2 * d1, d = d1 * d2;
      const ans = frac(n, d);
      const wrong = [frac(n1 + n2, d1 + d2), frac(n + d2, d), frac(Math.abs(n1 * d2 - n2 * d1) || 1, d)].filter((x) => x !== ans);
      return { q: `${n1}/${d1} + ${n2}/${d2}`, a: ans, wrong: [...new Set(wrong)] };
    }
    if (t === 2) { // степени с одинаковым основанием
      const b = api.pick([2, 3, 5, 10]), x = R(2, 6), y = R(1, 4), z = R(1, x + y - 1);
      const v = b ** (x + y - z);
      return { q: `${b}^${x} · ${b}^${y} : ${b}^${z}`, a: v, wrong: [b ** (x * y - z), b ** (x + y), b ** Math.max(1, x - y - z + 2)].filter((w) => w !== v) };
    }
    if (t === 3) { // корни
      const k = R(2, 12), m = api.pick([2, 3, 5]);
      return { q: `√${k * k * m} · √${m}`, a: k * m, wrong: near(k * m) };
    }
    if (t === 4) { // отрицательные степени и дроби
      const b = api.pick([2, 4, 5]), n = R(1, 3);
      const v = b ** n;
      return { q: `1 : ${b}^(−${n})`, a: v, wrong: [-v, 1 / v, v * b].map((x) => (Number.isInteger(x) ? x : `1/${Math.round(1 / x)}`)).filter((x) => x !== v) };
    }
    // порядок действий
    const a = R(2, 9), b = R(2, 9), c = R(2, 9), d = R(10, 40);
    const v = d - a * b + c;
    return { q: `${d} − ${a} · ${b} + ${c}`, a: v, wrong: [(d - a) * b + c, d - a * (b + c), d - a * b - c].filter((w) => w !== v) };
  },
}));
