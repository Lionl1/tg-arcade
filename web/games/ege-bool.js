// ЕГЭ информатика: логика — на скольких наборах переменных выражение истинно (генератор)
Arcade.register(Learn.deck({
  ask: L('При скольких наборах (A, B, C) выражение истинно?', 'For how many assignments of (A, B, C) is the expression true?'),
  howto: L('∧ — И, ∨ — ИЛИ, ¬ — НЕ, → — импликация (ложна только 1 → 0), ≡ — эквивалентность. Всего наборов 8. 90 секунд, ошибка −3 с.', '∧ — AND, ∨ — OR, ¬ — NOT, → — implication (false only for 1 → 0), ≡ — equivalence. There are 8 assignments. 90 seconds, a mistake costs 3 s.'),
  seconds: 90,
  gen(api) {
    const V = ['A', 'B', 'C'];
    const ops = api.score >= 6 ? ['∧', '∨', '→', '≡'] : ['∧', '∨'];
    const lit = () => { const v = api.pick(V); return api.rand() < 0.35 ? { s: `¬${v}`, f: (e) => !e[v] } : { s: v, f: (e) => e[v] }; };
    const bin = (a, b, op) => ({
      s: `(${a.s} ${op} ${b.s})`,
      f: { '∧': (e) => a.f(e) && b.f(e), '∨': (e) => a.f(e) || b.f(e), '→': (e) => !a.f(e) || b.f(e), '≡': (e) => a.f(e) === b.f(e) }[op],
    });
    const x = bin(bin(lit(), lit(), api.pick(ops)), lit(), api.pick(ops));
    let cnt = 0;
    for (let m = 0; m < 8; m++) if (x.f({ A: !!(m & 4), B: !!(m & 2), C: !!(m & 1) })) cnt++;
    const s = x.s.replace(/^\((.*)\)$/, '$1');
    return { q: s, a: cnt, wrong: [cnt + 1, cnt - 1, cnt + 2, cnt - 2, 8 - cnt].filter((v) => v >= 0 && v <= 8 && v !== cnt) };
  },
}));
