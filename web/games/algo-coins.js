// Динамическое программирование: размен монет минимальным числом
Arcade.register(Algo.viz({
  about: 'Динамическое программирование: решаем задачу для всех меньших сумм и складываем ответ из готовых. dp[s] — минимум монет для суммы s: dp[s] = min(dp[s − c] + 1) по всем монетам c. Жадный выбор «сначала крупные» здесь может ошибаться — а ДП нет.',
  complexity: 'O(сумма × число монет) времени, O(сумма) памяти',
  code: ['dp[0] = 0, остальные = ∞', 'for s in 1..сумма:', '  for c in монеты:', '    if c ≤ s: dp[s] = min(dp[s], dp[s − c] + 1)', 'ответ — dp[сумма]'],
  make(api) {
    const sets = [[1, 3, 4], [1, 5, 6], [1, 4, 5], [2, 3, 7], [1, 7, 10]];
    const coins = api.pick(sets);
    return { coins, amount: 7 + api.randi(6) };
  },
  run({ coins, amount }) {
    const dp = [0].concat(new Array(amount).fill(Infinity)), F = [];
    const p = (l, t, s, from) => F.push({ s: { dp: dp.slice(), s, from, coins, amount }, l, t });
    p(0, `Монеты: ${coins.join(', ')}; сумма ${amount}`);
    for (let s = 1; s <= amount; s++) {
      for (const c of coins) {
        if (c > s) continue;
        const cand = dp[s - c] + 1;
        if (cand < dp[s]) { dp[s] = cand; p(3, `dp[${s}] = dp[${s - c}] + 1 = ${cand} (монета ${c})`, s, s - c); }
        else p(2, `Монета ${c}: dp[${s - c}] + 1 = ${cand} — не лучше`, s, s - c);
      }
    }
    p(4, dp[amount] === Infinity ? 'Набрать нельзя' : `Ответ: ${dp[amount]} монет(ы)`, amount, -1);
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { dp, s, from, amount } = f.s;
    const n = amount + 1, cell = Math.min(40, (W - 16) / n), ox = (W - cell * n) / 2, y = H / 2 - cell / 2;
    ctx.font = `600 ${Math.max(10, cell * 0.38)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    dp.forEach((v, k) => {
      ctx.fillStyle = k === s ? C.warn : k === from ? C.good : v === Infinity ? 'rgba(127,127,127,.18)' : C.accent;
      ctx.fillRect(ox + k * cell + 1, y, cell - 2, cell);
      ctx.fillStyle = v === Infinity ? C.hint : '#fff'; ctx.fillText(v === Infinity ? '∞' : v, ox + k * cell + cell / 2, y + cell / 2);
      ctx.fillStyle = C.hint; ctx.fillText(k, ox + k * cell + cell / 2, y + cell + 12);
    });
    ctx.fillText('сумма s', W / 2, y + cell + 30);
    ctx.textBaseline = 'alphabetic';
  },
}));
