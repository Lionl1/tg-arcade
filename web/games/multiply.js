// Умножение: от таблицы до двузначных чисел. Сложность растёт с уровнем и счётом.
Arcade.register(Learn.deck({
  ask: 'Сколько будет?',
  howto: 'Сначала таблица умножения, потом двузначное на однозначное, квадраты и двузначное на двузначное. 60 секунд, ошибка −3 с.',
  gen(api) {
    const R = (lo, hi) => lo + api.randi(hi - lo + 1);
    const tier = Math.max(api.mode === 'level' ? Math.floor((api.level - 1) / 4) : 0, api.score < 8 ? 0 : api.score < 16 ? 1 : 2);
    let a, b, q;
    if (tier === 0) { a = R(2, 9); b = R(2, 9); q = `${a} × ${b}`; }
    else if (tier === 1) { a = R(11, 29); b = R(3, 9); q = `${a} × ${b}`; }
    else if (api.rand() < 0.4) { a = b = R(11, 25); q = `${a}²`; }
    else { a = R(11, 25); b = R(11, 19); q = `${a} × ${b}`; }
    const ans = a * b;
    const wrong = [...new Set([ans + a, ans - b, ans + 10, ans - 10, ans + 1].filter((v) => v > 0 && v !== ans))];
    return { q, a: ans, wrong: api.shuffle(wrong).slice(0, 3) };
  },
}));
