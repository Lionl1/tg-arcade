// Соседи: какая страна граничит с данной? Данные о границах — mledoze/countries (ODbL 1.0)
Learn.load('games/data/geo.json', (d) => {
  const byIso = Object.fromEntries(window.COUNTRIES.map((c) => [c.iso, c]));
  const cards = [];
  for (const c of window.COUNTRIES) {
    const nb = ((d.countries[c.iso] || {}).borders || []).filter((i) => byIso[i]);
    if (!nb.length) continue;
    const far = window.COUNTRIES.filter((o) => o.part === c.part && o.iso !== c.iso && !nb.includes(o.iso)).map((o) => `${o.flag} ${o.name}`);
    if (far.length < 3) continue;
    for (const n of nb) cards.push({ q: `${c.flag} ${c.name}`, a: `${byIso[n].flag} ${byIso[n].name}`, wrong: far, g: c.part, d: Math.max(c.d, byIso[n].d) });
  }
  return {
    ask: L('Какая из этих стран — сосед (общая сухопутная граница)?', 'Which of these countries is a neighbour (shares a land border)?'),
    rule: L('Границы — открытый набор mledoze/countries (ODbL).', 'Borders from the open mledoze/countries dataset (ODbL).'),
    cards: cards.map((c) => ({ q: c.q, a: c.a, g: c.g, d: c.d, pool: c.wrong })),
  };
});
