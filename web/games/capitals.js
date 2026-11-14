// Все страны мира (194): страна → столица. Неверные варианты — из той же части света.
Arcade.register(Learn.deck({
  ask: L('Столица страны', 'Capital of the country'),
  askRev: L('Чья это столица?', 'Whose capital is this?'),
  both: true,
  cards: window.COUNTRIES.map((c) => ({ q: c.name, a: c.capital, g: c.part, d: c.d })),
}));
