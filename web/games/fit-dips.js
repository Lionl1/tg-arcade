// Брусья: отжимания на брусьях + обратные отжимания + отжимания от пола.
Arcade.register(Fit.workout({
  howto: L('Программа на брусьях по дням. Новичкам — сначала обратные отжимания от скамьи, потом брусья. Отмечай повторения, отдыхай по таймеру.',
    'A dips programme by days. Beginners start with bench dips, then the bars. Log your reps, rest on the timer.'),
  plan(lv) {
    const r = Math.min(25, 3 + Math.floor(lv * 0.8));
    return [
      ...Fit.sets('Bench_Dips', 2, 8 + lv, 60),
      ...(lv <= 2 ? [] : Fit.sets('Parallel_Bar_Dip', lv >= 10 ? 5 : 4, r, 120)),
      ...(lv >= 8 ? Fit.sets('Dips_-_Chest_Version', 2, Math.max(3, r - 4), 90) : []),
      ...Fit.sets('Pushups', 2, 8 + lv, 60),
      ...Fit.hold('Chest_And_Front_Of_Shoulder_Stretch', 1, 30, 0),
    ];
  },
}));
