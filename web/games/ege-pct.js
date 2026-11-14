// ЕГЭ математика: проценты, задачи на смысл и вероятность
Arcade.register(Learn.deck({
  ask: L('Решите задачу', 'Solve the problem'),
  howto: L('Проценты, изменение цены, классическая вероятность. 90 секунд, ошибка −3 с.', 'Percentages, price changes, classical probability. 90 seconds, a mistake costs 3 s.'),
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const dec = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
    const t = api.randi(4);
    if (t === 0) { const p = api.pick([5, 10, 15, 20, 25, 30, 40, 60, 75]), n = R(4, 40) * 20; const v = (p * n) / 100; return { q: L(`Сколько составляет ${p}% от ${n}?`, `What is ${p}% of ${n}?`), a: v, wrong: Learn.nearNumbers(api, v, 3, Math.max(2, Math.round(v * 0.2))) }; }
    if (t === 1) { const price = R(10, 90) * 100, p = api.pick([10, 15, 20, 25, 30]); const up = api.rand() < 0.5; const v = up ? price * (1 + p / 100) : price * (1 - p / 100); return { q: L(`Товар стоил ${price} ₽. Цену ${up ? 'повысили' : 'снизили'} на ${p}%. Сколько он стоит теперь?`, `An item cost $${price}. Its price was ${up ? 'raised' : 'cut'} by ${p}%. What does it cost now?`), a: v, wrong: [up ? price * (1 - p / 100) : price * (1 + p / 100), price + (up ? p : -p), price * p / 100].filter((w) => w !== v) }; }
    if (t === 2) { const total = api.pick([20, 25, 40, 50]), good = R(1, total - 1); return { q: L(`В коробке ${total} шаров, из них ${good} красных. Какова вероятность наугад вытащить красный?`, `A box holds ${total} balls, ${good} of them red. What is the probability of drawing a red one at random?`), a: dec(good / total), wrong: [dec((total - good) / total), dec(good / 100), dec(1 / good)].filter((w) => w !== dec(good / total)) }; }
    const n = api.pick([2, 3]); return { q: L(`Монету бросают ${n} раза. Какова вероятность, что орёл выпадет ровно 1 раз?`, `A coin is tossed ${n} times. What is the probability of exactly 1 head?`), a: dec(n / 2 ** n), wrong: [dec(1 / 2), dec(1 / 2 ** n), dec(1 / n)].filter((w) => w !== dec(n / 2 ** n)) };
  },
}));
