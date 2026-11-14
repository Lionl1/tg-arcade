// Воркаут: круговая на турнике и брусьях (street workout).
Arcade.register(Fit.workout({
  howto: L('Круговая на площадке: подтягивания → брусья → подъём ног → отжимания → приседания, без отдыха внутри круга. Нужны турник и брусья.',
    'A playground circuit: pull-ups → dips → leg raises → push-ups → squats, no rest inside a round. You need a pull-up bar and dip bars.'),
  plan(lv) {
    const k = Math.floor(lv / 2), rounds = Math.min(6, 3 + Math.floor(lv / 6));
    return Fit.circuit([['Pullups', { reps: Math.min(15, 3 + k) }], ['Parallel_Bar_Dip', { reps: Math.min(20, 5 + k) }], ['Hanging_Leg_Raise', { reps: Math.min(15, 4 + k) }],
      ['Pushups', { reps: Math.min(30, 10 + k * 2) }], ['Bodyweight_Squat', { reps: Math.min(40, 15 + k * 2) }]], rounds, 10, 120);
  },
}));
