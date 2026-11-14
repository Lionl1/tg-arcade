// Английские фразы из Tatoeba (CC BY 2.0 FR, tatoeba.org): короткие живые предложения в обе стороны
Learn.load('games/data/phrases.json', (d) => ({
  ask: L('Переведи на русский', 'Translate into Russian'),
  askRev: L('Как это по-английски?', 'How do you say it in English?'),
  both: true,
  rule: L('Фразы — из открытого корпуса Tatoeba (tatoeba.org, CC BY 2.0 FR).', 'Phrases from the open Tatoeba corpus (tatoeba.org, CC BY 2.0 FR).'),
  // неверные варианты — фразы той же длины, чтобы не угадывалось по размеру
  cards: d.phrases.map(([en, ru]) => { const n = en.split(' ').length; return { q: en, a: ru, g: String(n), d: n <= 4 ? 1 : n === 5 ? 2 : 3 }; }),
}));
