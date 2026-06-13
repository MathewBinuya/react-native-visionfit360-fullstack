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
    // bicepcurls
  {
    key: "bicepcurl",
    label: "Bicep Curls",
    group: "Arms",
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
  },
      // lateralraise
  {
    key: "lateralraise",
    label: "Lateral Raises",
    group: "Shoulders",
    icon: "body-outline",
    targetReps: 12,
    working: true,
  },

      // shoulderpress
  { 
    key: "shoulderpress",
    label: "Shoulder Press",
    group: "Shoulders",
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
  },

     // jumpingjack
  {
    key: "jumpingjack",
    label: "Jumping Jacks",
    group: "Cardio",
    icon: "body-outline",
    targetReps: 20,
    working: true,
  },
    // highknees
  {
    key: "highknees",
    label: "High Knees",
    group: "Cardio",
    icon: "body-outline",
    targetReps: 20,
    working: true,
  },

  {
    key: "frontraise",
    label: "Front Raises",
    group: "Shoulders",
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
  },





];