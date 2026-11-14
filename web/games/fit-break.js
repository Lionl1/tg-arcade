// Разминка от телефона: 3 минуты для шеи, плеч, запястий, спины и ног — когда долго сидишь в телефоне.
Arcade.register(Fit.workout({
  howto: L('Долго в телефоне? Встань! 3 минуты: шея, плечи, запястья, спина и пара приседаний. Заодно дай глазам отдых: посмотри вдаль 20 секунд.',
    'Been on your phone a while? Stand up! 3 minutes: neck, shoulders, wrists, back and a few squats. Also rest your eyes: look into the distance for 20 seconds.'),
  plan() {
    return [...Fit.hold('Side_Neck_Stretch', 1, 20, 3), ...Fit.hold('Shoulder_Stretch', 1, 20, 3), ...Fit.hold('Kneeling_Forearm_Stretch', 1, 20, 3),
      ...Fit.hold('Chest_And_Front_Of_Shoulder_Stretch', 1, 20, 3), ...Fit.hold('Standing_Lateral_Stretch', 1, 20, 3), ...Fit.sets('Bodyweight_Squat', 1, 15, 3),
      ...Fit.hold('Spinal_Stretch', 1, 20, 0)];
  },
}));
