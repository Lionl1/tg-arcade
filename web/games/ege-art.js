// ЕГЭ история (культура): кто написал картину. Данные — Wikidata (CC0), сборка: tools/wikidata_fetch.py + tools/build_data.py
Learn.load('games/data/ege-art.json', (d) => ({
  ask: 'Кто автор картины?',
  rule: 'Картины русских художников — из открытой базы Wikidata (CC0). В ЕГЭ по истории есть задания на культуру: узнай автора по названию.',
  reveal: (c) => `${c.q} — ${c.a}${c.y ? ', ' + c.y : ''}`,
  cards: d.cards.map(([q, a, y, lv]) => ({ q: `«${q}»`, a, y, d: lv })),
}));
