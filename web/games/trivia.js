// Эрудиция на английском: вопросы Open Trivia Database (CC BY-SA 4.0, opentdb.com)
Learn.load('games/data/trivia.json', (d) => ({
  ask: 'Trivia (English)',
  rule: L('Вопросы — Open Trivia Database (opentdb.com), CC BY-SA 4.0. Заодно тренируешь английский.', 'Questions from the Open Trivia Database (opentdb.com), CC BY-SA 4.0.'),
  cards: d.questions.map(([cat, diff, q, a, wrong]) => ({ q: `${q}`, a, wrong, g: cat, d: { easy: 1, medium: 2, hard: 3 }[diff] || 2 })),
}));
