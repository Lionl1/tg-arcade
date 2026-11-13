// Прикинь: быстрая оценка порядка величины без точного счёта
Arcade.register(Learn.deck({
  ask: 'Примерно сколько? Выбери ближайшее',
  howto: 'Не считай точно — прикинь! Выбери вариант, ближайший к ответу. Чем выше счёт, тем ближе друг к другу варианты. 45 секунд, ошибка −3 с.',
  seconds: 45,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const t = api.randi(5);
    let q, v;
    if (t === 0) { const a = R(12, 99), b = R(12, 99); q = `${a} × ${b}`; v = a * b; }
    else if (t === 1) { const a = R(120, 990), b = R(120, 990), c = R(120, 990); q = `${a} + ${b} + ${c}`; v = a + b + c; }
    else if (t === 2) { const a = R(1000, 9999), b = R(7, 49); q = `${a} ÷ ${b}`; v = a / b; }
    else if (t === 3) { const p = api.pick([12, 15, 18, 23, 27, 35, 42, 65, 78]), n = R(150, 2400); q = `${p}% от ${n}`; v = (p * n) / 100; }
    else { const a = R(11, 40); q = `${a}²`; v = a * a; }
    const spread = Math.max(0.12, 0.6 - api.score * 0.02); // варианты сближаются по мере роста счёта
    const round = (x) => { const m = 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x))) - 1); return Math.round(x / m) * m; };
    const ans = round(v);
    const opts = new Set([ans]);
    const k = [1 + spread, 1 - spread * 0.7, 1 + spread * 2.1, 1 - spread * 1.3, 1 + spread * 3];
    for (const f of api.shuffle(k)) { const o = round(v * f); if (o > 0 && o !== ans) opts.add(o); if (opts.size === 4) break; }
    return { q: `${q} ≈ ?`, a: ans, wrong: [...opts].filter((o) => o !== ans) };
  },
}));
