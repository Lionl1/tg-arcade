// Растяжка: спокойные удержания на всё тело — после тренировки или вечером.
Arcade.register(Fit.workout({
  howto: L('Растяжка всего тела: удерживай каждое положение, дыши спокойно, без боли и рывков. Хорошо после тренировки и перед сном.',
    'Full-body stretching: hold each position, breathe calmly, no pain and no bouncing. Great after a workout and before bed.'),
  plan(lv) {
    const h = Math.min(60, 25 + lv * 2);
    return ['Side_Neck_Stretch', 'Shoulder_Stretch', 'Chest_And_Front_Of_Shoulder_Stretch', 'Standing_Lateral_Stretch', 'Cat_Stretch', 'Spinal_Stretch',
      'Hamstring_Stretch', 'Quad_Stretch', 'Kneeling_Forearm_Stretch'].flatMap((e) => Fit.hold(e, 1, h, 5));
  },
}));
