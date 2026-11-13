// Все страны мира (194): страна → столица. Неверные варианты — из той же части света.
Arcade.register(Learn.deck({
  ask: 'Столица страны',
  askRev: 'Чья это столица?',
  both: true,
  cards: window.COUNTRIES.map((c) => ({ q: c.name, a: c.capital, g: c.part, d: c.d })),
}));
