// Табата: 8 раундов по 20 секунд работы и 10 секунд отдыха (протокол Tabata et al., 1996).
Arcade.register(Fit.workout({
  howto: L('Табата: 20 секунд максимально интенсивно, 10 секунд отдыха, 8 раундов — 4 минуты. С каждым днём блоков больше. Протокол из исследования Tabata et al. (1996).',
    'Tabata: 20 seconds all-out, 10 seconds rest, 8 rounds — 4 minutes. More blocks every day. The protocol comes from Tabata et al. (1996).'),
  plan(lv) {
    const blocks = [['Freehand_Jump_Squat', 'Mountain_Climbers'], ['Pushups', 'Star_Jump'], ['Knee_Tuck_Jump', 'Plank']].slice(0, Math.min(3, 1 + Math.floor(lv / 5)));
    return blocks.flatMap(([a, b], k) => {
      const c = Fit.circuit([[a, { sec: 20 }], [b, { sec: 20 }]], 4, 10, 10); // 8 интервалов: 20 с работы / 10 с отдыха
      c[c.length - 1].rest = k < blocks.length - 1 ? 60 : 0; // минута между блоками
      return c;
    });
  },
}));
