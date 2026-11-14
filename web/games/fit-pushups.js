// Отжимания: программа по дням — от отжиманий от опоры до 50+ за подход и сложных вариантов.
Arcade.register(Fit.workout({
  howto: L('Отжимания по дням: пять подходов, последний — «сколько сможешь». Каждый день немного больше. Начинаешь с отжиманий от опоры — ничего страшного.',
    'Push-ups by days: five sets, the last one is “as many as you can”. A little more each day. Starting with incline push-ups is perfectly fine.'),
  plan(lv) {
    const ex = lv <= 3 ? 'Incline_Push-Up' : 'Pushups', r = lv <= 3 ? 8 + lv * 2 : Math.min(40, 5 + lv * 2);
    const extra = lv >= 15 ? Fit.sets('Plyo_Push-up', 2, 6 + Math.floor((lv - 15) / 2), 90) : lv >= 8 ? Fit.sets('Push-Ups_-_Close_Triceps_Position', 2, Math.floor(r / 2), 75) : [];
    return [
      ...Fit.hold('Star_Jump', 1, 40, 20),
      ...Fit.sets(ex, 4, r, 75), ...Fit.sets(ex, 1, Math.round(r * 1.3), 60),
      ...Fit.sets('Push-Up_Wide', 1, Math.max(5, Math.round(r * 0.6)), 60), ...extra,
      ...(lv >= 25 ? Fit.sets('Single-Arm_Push-Up', 2, 3, 90) : []),
      ...Fit.hold('Plank', 1, 30 + lv * 2, 0),
    ];
  },
}));
