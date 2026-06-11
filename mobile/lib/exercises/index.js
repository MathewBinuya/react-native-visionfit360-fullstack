import pushup from "./pushup";
// import squat from "./squat";   // add as you create them
// import lunge from "./lunge";
// import plank from "./plank";

// the master list the AR select screen reads
export const AR_EXERCISES = [
  pushup,
  // squat,
  // lunge,
  // plank,
];

// quick lookup by key (used by the tracker screen)
export const getExercise = (key) => AR_EXERCISES.find((e) => e.key === key);