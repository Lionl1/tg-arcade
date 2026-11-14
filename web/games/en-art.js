// Art history: who painted it? World-famous paintings. Data — Wikidata (CC0), built by tools/wikidata_fetch.py + tools/build_data.py
Learn.load('games/data/en-art.json', (d) => ({
  ask: 'Who painted it?',
  rule: 'Famous paintings from the open Wikidata database (CC0). Art history appears in history and humanities courses.',
  reveal: (c) => `${c.q} — ${c.a}${c.y ? ', ' + c.y : ''}`,
  cards: d.cards.map(([q, a, y, lv]) => ({ q: `“${q}”`, a, y, d: lv })),
}));
