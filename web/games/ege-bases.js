// ЕГЭ информатика: системы счисления (генератор)
Arcade.register(Learn.deck({
  ask: L('Переведите число', 'Convert the number'),
  howto: L('Переводы между двоичной, восьмеричной, шестнадцатеричной и десятичной системами + подсчёт единиц в двоичной записи. 90 секунд, ошибка −3 с.', 'Conversions between binary, octal, hexadecimal and decimal + counting ones in binary. 90 seconds, a mistake costs 3 s.'),
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const max = Math.min(1023, 31 + api.score * 30);
    const n = R(5, max);
    const near = () => [...new Set([n + 1, n - 1, n + 2, n ^ 1, n ^ 2, n + 8, n - 4].filter((v) => v > 0 && v !== n))].slice(0, 6);
    const t = api.randi(5);
    if (t === 0) return { q: `${n.toString(2)}₂ = ?₁₀`, a: n, wrong: api.shuffle(near()).slice(0, 3) };
    if (t === 1) return { q: `${n}₁₀ = ?₂`, a: n.toString(2), wrong: api.shuffle(near()).slice(0, 3).map((v) => v.toString(2)) };
    if (t === 2) return { q: `${n.toString(16).toUpperCase()}₁₆ = ?₁₀`, a: n, wrong: api.shuffle(near()).slice(0, 3) };
    if (t === 3) return { q: `${n.toString(8)}₈ = ?₁₀`, a: n, wrong: api.shuffle(near()).slice(0, 3) };
    const ones = n.toString(2).split('').filter((c) => c === '1').length;
    return { q: L(`Сколько единиц в двоичной записи числа ${n}?`, `How many ones are in the binary form of ${n}?`), a: ones, wrong: [ones + 1, ones - 1, ones + 2].filter((v) => v >= 0) };
  },
}));
