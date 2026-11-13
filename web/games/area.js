// Какая страна больше по площади? Данные — mledoze/countries (ODbL 1.0)
Learn.load('games/data/geo.json', (d) => ({
  ask: 'Какая страна больше по площади?',
  howto: 'Выбери страну с большей площадью. С ростом счёта пары всё ближе по размеру. 60 секунд, ошибка −3 с.',
  gen(api) {
    const list = window.COUNTRIES.filter((c) => (d.countries[c.iso] || {}).area > 0);
    const ratio = Math.max(1.15, 4 - api.score * 0.15); // насколько различаются площади: дальше — ближе
    for (let t = 0; t < 200; t++) {
      const a = api.pick(list), b = api.pick(list);
      const A = d.countries[a.iso].area, B = d.countries[b.iso].area;
      const r = Math.max(A, B) / Math.min(A, B);
      if (a === b || r > ratio * 2 || r < Math.min(ratio, 1.6) * 0.75) continue;
      const big = A > B ? a : b, small = A > B ? b : a;
      return { q: `${a.flag} ${a.name}  или  ${b.flag} ${b.name}?`, a: `${big.flag} ${big.name}`, wrong: [`${small.flag} ${small.name}`] };
    }
    return { q: '🇷🇺 Россия  или  🇫🇷 Франция?', a: '🇷🇺 Россия', wrong: ['🇫🇷 Франция'] };
  },
}));
