// AR exercises shown on the selection screen.
// This is just the MENU DATA (which buttons appear).
// The actual detection logic lives in assets/posedetect.html (the EXERCISES registry).
//
// `key` MUST match the exercise name in posedetect.html.

export const AR_EXERCISES = [
  {
    key: "squat",
    label: "Squats",
    group: "Legs",
    icon: "body-outline",
    targetReps: 10,
    working: true,
  },

  // --- Add more exercises below as you build their logic in posedetect.html ---
  // {
  //   key: "pushup",
  //   label: "Push-ups",
  //   group: "Chest",
  //   icon: "fitness-outline",
  //   targetReps: 10,
  //   working: false,
  // },
];