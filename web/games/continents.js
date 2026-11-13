// Где находится страна: часть света
Arcade.register(Learn.deck({
  ask: 'В какой части света?',
  cards: window.COUNTRIES.map((c) => ({ q: `${c.flag} ${c.name}`, a: c.part, d: c.d })),
}));
