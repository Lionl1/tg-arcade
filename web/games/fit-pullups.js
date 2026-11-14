// Турник: подтягивания. Прогрессия по дням: от австралийских и с резинкой — к сериям подтягиваний и висам.
Arcade.register(Fit.workout({
  howto: L('Программа на турнике по дням: каждый уровень — следующий день. Делай упражнения, отмечай сколько получилось, отдыхай по таймеру. Пройти день — выполнить ≥81% плана. Тренируйся через день.',
    'A pull-up bar programme by days: each level is the next day. Do the exercises, log your reps, rest on the timer. A day is cleared at ≥81% of the plan. Train every other day.'),
  plan(lv) {
    const r = Math.min(20, 2 + Math.floor(lv / 2));
    const base = [...Fit.sets('Scapular_Pull-Up', 2, 8, 45)];
    const main = lv <= 3
      ? [...Fit.sets('Inverted_Row', 3, 6 + lv * 2, 75), ...Fit.sets('Band_Assisted_Pull-Up', 3, 3 + lv, 90)]
      : [...Fit.sets('Pullups', lv >= 12 ? 5 : 4, r, 120), ...Fit.sets('Chin-Up', 2, Math.max(2, r - 2), 90)];
    return [...base, ...main, ...Fit.sets('Hanging_Leg_Raise', 2, 5 + Math.floor(lv / 3), 60), ...Fit.hold('One_Handed_Hang', 1, Math.min(90, 20 + lv * 3), 0),
      ...(lv >= 20 ? Fit.sets('Muscle_Up', 3, Math.min(5, 1 + Math.floor((lv - 20) / 4)), 150) : [])];
  },
}));
