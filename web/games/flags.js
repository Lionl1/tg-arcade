// Флаги всех стран мира (194). Неверные варианты — соседи по части света.
Arcade.register(Learn.deck({
  ask: 'Чей это флаг?',
  big: true,
  cards: window.COUNTRIES.map((c) => ({ q: c.flag, a: c.name, g: c.part, d: c.d })),
}));
