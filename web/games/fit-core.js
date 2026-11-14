// Пресс и кор: планки, скручивания, ножницы, супермен.
Arcade.register(Fit.workout({
  howto: L('Пресс и мышцы-стабилизаторы: планки на время и динамика. 10–15 минут, через день.',
    'Abs and core: timed planks and dynamic moves. 10–15 minutes, every other day.'),
  plan(lv) {
    const h = Math.min(120, 25 + lv * 4), r = Math.min(40, 12 + lv * 2);
    return [...Fit.hold('Plank', 2, h, 30), ...Fit.hold('Side_Bridge', 2, Math.round(h * 0.6), 20), ...Fit.sets('Crunches', 2, r, 30),
      ...Fit.sets('Reverse_Crunch', 2, Math.round(r * 0.7), 30), ...Fit.hold('Flutter_Kicks', 2, Math.round(h * 0.5), 20), ...Fit.sets('Superman', 2, 10 + lv, 30),
      ...Fit.hold('Cat_Stretch', 1, 40, 0)];
  },
}));
