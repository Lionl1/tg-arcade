// ЕГЭ математика: проценты, задачи на смысл и вероятность
Arcade.register(Learn.deck({
  ask: 'Решите задачу',
  howto: 'Проценты, изменение цены, классическая вероятность. 90 секунд, ошибка −3 с.',
  seconds: 90,
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const dec = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
    const t = api.randi(4);
    if (t === 0) { const p = api.pick([5, 10, 15, 20, 25, 30, 40, 60, 75]), n = R(4, 40) * 20; const v = (p * n) / 100; return { q: `Сколько составляет ${p}% от ${n}?`, a: v, wrong: Learn.nearNumbers(api, v, 3, Math.max(2, Math.round(v * 0.2))) }; }
    if (t === 1) { const price = R(10, 90) * 100, p = api.pick([10, 15, 20, 25, 30]); const up = api.rand() < 0.5; const v = up ? price * (1 + p / 100) : price * (1 - p / 100); return { q: `Товар стоил ${price} ₽. Цену ${up ? 'повысили' : 'снизили'} на ${p}%. Сколько он стоит теперь?`, a: v, wrong: [up ? price * (1 - p / 100) : price * (1 + p / 100), price + (up ? p : -p), price * p / 100].filter((w) => w !== v) }; }
    if (t === 2) { const total = api.pick([20, 25, 40, 50]), good = R(1, total - 1); return { q: `В коробке ${total} шаров, из них ${good} красных. Какова вероятность наугад вытащить красный?`, a: dec(good / total), wrong: [dec((total - good) / total), dec(good / 100), dec(1 / good)].filter((w) => w !== dec(good / total)) }; }
    const n = api.pick([2, 3]); return { q: `Монету бросают ${n} раза. Какова вероятность, что орёл выпадет ровно 1 раз?`, a: dec(n / 2 ** n), wrong: [dec(1 / 2), dec(1 / 2 ** n), dec(1 / n)].filter((w) => w !== dec(n / 2 ** n)) };
  },
}));
