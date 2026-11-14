// Утренняя зарядка ≈7–10 минут: высокоинтенсивные интервалы на всё тело (по мотивам HICT, Klika & Jordan, 2013).
Arcade.register(Fit.workout({
  howto: L('Быстрая зарядка: 12 упражнений по 30 секунд с отдыхом 10 секунд. Разбудит и разогреет всё тело. Основа — исследование Klika & Jordan (2013) о коротких интервальных тренировках.',
    'A quick morning set: 12 exercises of 30 seconds with 10-second rests. Wakes up and warms the whole body. Based on Klika & Jordan (2013) on short interval training.'),
  plan(lv) {
    const w = Math.min(45, 30 + Math.floor(lv / 2)), rounds = lv >= 10 ? 2 : 1;
    return Fit.circuit([['Star_Jump', { sec: w }], ['Bodyweight_Squat', { sec: w }], ['Pushups', { sec: w }], ['Crunches', { sec: w }],
      ['Step-up_with_Knee_Raise', { sec: w }], ['Bench_Dips', { sec: w }], ['Plank', { sec: w }], ['Mountain_Climbers', { sec: w }],
      ['Bodyweight_Walking_Lunge', { sec: w }], ['Push-Up_Wide', { sec: w }], ['Side_Bridge', { sec: w }], ['Butt_Lift_Bridge', { sec: w }]], rounds, 10, 60);
  },
}));
