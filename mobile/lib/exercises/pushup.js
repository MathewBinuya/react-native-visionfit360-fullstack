// Push-up exercise definition.
// `key` must match PoseTracker's exact exercise= value (confirm from your account).
const pushup = {
  key: "pushup",
  label: "Push-ups",
  group: "Chest",
  icon: "fitness-outline",
  targetReps: 10,                 // default goal for a set
  difficulty: "easy",             // passed to PoseTracker URL
  // form tips shown on screen during tracking
  tips: [
    "Keep your back straight",
    "Lower until elbows are 90°",
    "Don't let your hips sag",
  ],
};

export default pushup;