// ЕГЭ история (культура): архитектор постройки. Данные — Wikidata (CC0), сборка: tools/wikidata_fetch.py + tools/build_data.py
Learn.load('games/data/ege-arch.json', (d) => ({
  ask: 'Кто архитектор?',
  rule: 'Постройки России с указанным в Wikidata (CC0) архитектором. Взяты только те, у которых архитектор один, — ответ однозначен.',
  cards: d.cards.map(([q, a, lv]) => ({ q: q[0].toUpperCase() + q.slice(1), a, d: lv })),
}));
