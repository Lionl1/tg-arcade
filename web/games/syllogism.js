// Логические выводы: следует ли вывод из посылок? Слова выдуманные — чтобы решала логика, а не знания о мире.
Arcade.register(Learn.deck({
  ask: L('Следует ли вывод из посылок?', 'Does the conclusion follow from the premises?'),
  howto: L('Две-три посылки и вывод. Ответь, следует ли вывод СТРОГО логически. Слова выдуманные — не опирайся на смысл. С ростом счёта цепочки длиннее. 90 секунд, ошибка −3 с.',
    'Two or three premises and a conclusion. Say whether the conclusion follows STRICTLY logically. The words are made up — do not rely on meaning. Chains get longer as your score grows. 90 seconds, a mistake costs 3 s.'),
  seconds: 90,
  gen(api) {
    const W = api.shuffle(L(['блики', 'тарпы', 'вусты', 'кремы', 'дольны', 'жиги', 'пломы', 'сарки', 'фуны', 'хвары', 'ципы', 'шмоки'],
      ['blicks', 'tarps', 'vusts', 'glorps', 'dolns', 'zigs', 'ploms', 'sarks', 'funs', 'kwars', 'zips', 'shmocks']));
    const [A, B, C, D] = W;
    if (LANG === 'en') { // те же формы рассуждений, английские формулировки
      const all = (x, y) => `All ${x} are ${y}`, some = (x, y) => `Some ${x} are ${y}`, no = (x, y) => `No ${x} are ${y}`;
      const f = [
        [`${all(A, B)}. ${all(B, C)}.`, all(A, C), true], [`${all(A, B)}. ${some(B, C)}.`, some(A, C), false],
        [`${all(A, B)}. ${no(B, C)}.`, no(A, C), true], [`${some(A, B)}. ${all(B, C)}.`, some(A, C), true],
        [`${all(A, B)}. ${all(C, B)}.`, all(A, C), false], [`${all(A, B)}.`, all(B, A), false],
        [`${no(A, B)}. ${all(C, B)}.`, no(C, A), true], [`${some(A, B)}. ${some(B, C)}.`, some(A, C), false],
        [`${all(A, B)}. ${no(C, A)}.`, no(C, B), false], [`${no(A, B)}.`, no(B, A), true],
      ];
      const lg = [
        [`${all(A, B)}. ${all(B, C)}. ${all(C, D)}.`, all(A, D), true], [`${all(A, B)}. ${all(C, B)}. ${all(C, D)}.`, all(A, D), false],
        [`${all(A, B)}. ${all(B, C)}. ${no(C, D)}.`, no(A, D), true], [`${some(A, B)}. ${all(B, C)}. ${all(C, D)}.`, some(A, D), true],
        [`${all(A, B)}. ${some(B, C)}. ${all(C, D)}.`, some(A, D), false],
      ];
      const pl = api.score >= 8 || (api.level || 0) >= 6 ? f.concat(lg, lg) : f;
      const [p, c, ok] = api.pick(pl);
      return { q: `${p}\n⇒ ${c}?`, a: ok ? 'Follows' : 'Does not follow', wrong: [ok ? 'Does not follow' : 'Follows'] };
    }
    const forms = [
      [`Все ${A} — ${B}. Все ${B} — ${C}.`, `Все ${A} — ${C}`, true],
      [`Все ${A} — ${B}. Некоторые ${B} — ${C}.`, `Некоторые ${A} — ${C}`, false],
      [`Все ${A} — ${B}. Никакие ${B} не ${C}.`, `Никакие ${A} не ${C}`, true],
      [`Некоторые ${A} — ${B}. Все ${B} — ${C}.`, `Некоторые ${A} — ${C}`, true],
      [`Все ${A} — ${B}. Все ${C} — ${B}.`, `Все ${A} — ${C}`, false],
      [`Все ${A} — ${B}.`, `Все ${B} — ${A}`, false],
      [`Никакие ${A} не ${B}. Все ${C} — ${B}.`, `Никакие ${C} не ${A}`, true],
      [`Некоторые ${A} — ${B}. Некоторые ${B} — ${C}.`, `Некоторые ${A} — ${C}`, false],
      [`Все ${A} — ${B}. Никакие ${C} не ${A}.`, `Никакие ${C} не ${B}`, false],
      [`Никакие ${A} не ${B}.`, `Никакие ${B} не ${A}`, true],
    ];
    const long = [
      [`Все ${A} — ${B}. Все ${B} — ${C}. Все ${C} — ${D}.`, `Все ${A} — ${D}`, true],
      [`Все ${A} — ${B}. Все ${C} — ${B}. Все ${C} — ${D}.`, `Все ${A} — ${D}`, false],
      [`Все ${A} — ${B}. Все ${B} — ${C}. Никакие ${C} не ${D}.`, `Никакие ${A} не ${D}`, true],
      [`Некоторые ${A} — ${B}. Все ${B} — ${C}. Все ${C} — ${D}.`, `Некоторые ${A} — ${D}`, true],
      [`Все ${A} — ${B}. Некоторые ${B} — ${C}. Все ${C} — ${D}.`, `Некоторые ${A} — ${D}`, false],
    ];
    const pool = api.score >= 8 || (api.level || 0) >= 6 ? forms.concat(long, long) : forms;
    const [p, c, ok] = api.pick(pool);
    return { q: `${p}\n⇒ ${c}?`, a: ok ? 'Следует' : 'Не следует', wrong: [ok ? 'Не следует' : 'Следует'] };
  },
}));
