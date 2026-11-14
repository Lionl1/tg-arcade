// Круговая тренировка без снарядов: всё тело, работа и отдых по таймеру.
Arcade.register(Fit.workout({
  howto: L('Круговая на всё тело без снарядов: упражнения по 30–50 секунд подряд, короткий отдых, потом новый круг. С каждым днём дольше работа и больше кругов.',
    'A full-body circuit with no equipment: 30–50-second exercises back to back, short rests, then another round. Each day the work gets longer and the rounds more.'),
  plan(lv) {
    const w = Math.min(50, 30 + lv * 2), rounds = Math.min(5, 2 + Math.floor(lv / 4));
    return Fit.circuit([['Star_Jump', { sec: w }], ['Bodyweight_Squat', { sec: w }], ['Pushups', { sec: w }], ['Bodyweight_Walking_Lunge', { sec: w }],
      ['Mountain_Climbers', { sec: w }], ['Butt_Lift_Bridge', { sec: w }], ['Plank', { sec: w }]], rounds, Math.max(10, 20 - lv), 60);
  },
}));
