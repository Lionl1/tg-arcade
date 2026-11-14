// Где находится страна: часть света
Arcade.register(Learn.deck({
  ask: L('В какой части света?', 'Which continent?'),
  cards: window.COUNTRIES.map((c) => ({ q: `${c.flag} ${c.name}`, a: c.part, d: c.d })),
}));
