Arcade.register(Learn.deck({
  howto: L('Переводи римские числа в обычные и обратно. Числа растут вместе со счётом. 60 секунд, ошибка −3 с.', 'Convert Roman numerals to ordinary numbers and back. The numbers grow with your score. 60 seconds, a mistake costs 3 s.'),
  gen(api) {
    const R = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    const roman = (n) => R.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
    const max = Math.min(2000, 20 + api.score * 15);
    const n = api.randi(max) + 1;
    const wrong = Learn.nearNumbers(api, n, 3, Math.max(3, Math.round(n * 0.1)));
    if (api.rand() < 0.5) return { q: roman(n), a: n, wrong, ask: L('Какое это число?', 'Which number is this?') };
    return { q: String(n), a: roman(n), wrong: wrong.map(roman), ask: L('Запиши римскими цифрами', 'Write it in Roman numerals') };
  },
}));
