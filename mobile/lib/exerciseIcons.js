// Per-exercise RepVision icons, keyed by AR_EXERCISES `key` (lib/exercises.js).
// These are monochrome 512x512 white-on-transparent PNGs, rendered tinted via
// <ExerciseIcon> (tintColor), so they recolor to whatever `color` is passed.
// Bundled as plain image assets — no extra library, no metro config.
//
// Source: @bryllim/workout-guide (https://github.com/bryllim/workout-guide),
// artwork by Bryl Lim derived from Everkinetic, licensed CC BY-SA 4.0
// (https://creativecommons.org/licenses/by-sa/4.0/). Attribution shown in-app.
//
// Two use the closest STANDING library pose (the art happens to show
// equipment): sidelegraise -> banded standing hip abduction, and
// tricepextension -> single-arm standing dumbbell overhead extension.

export const EXERCISE_ICON_CREDIT =
  "Exercise icons by Bryl Lim (workout-guide), from Everkinetic · CC BY-SA 4.0";

// require() needs static literals so Metro can bundle each asset.
export const EXERCISE_ICONS = {
  squat: require("../assets/exercise-icons/squat.png"),
  bicepcurl: require("../assets/exercise-icons/bicepcurl.png"),
  lateralraise: require("../assets/exercise-icons/lateralraise.png"),
  shoulderpress: require("../assets/exercise-icons/shoulderpress.png"),
  jumpingjack: require("../assets/exercise-icons/jumpingjack.png"),
  highknees: require("../assets/exercise-icons/highknees.png"),
  frontraise: require("../assets/exercise-icons/frontraise.png"),
  sidelegraise: require("../assets/exercise-icons/sidelegraise.png"),
  tricepextension: require("../assets/exercise-icons/tricepextension.png"),
  sumosquat: require("../assets/exercise-icons/sumosquat.png"),
  sidebend: require("../assets/exercise-icons/sidebend.png"),
  deadlift: require("../assets/exercise-icons/deadlift.png"),
  pushup: require("../assets/exercise-icons/pushup.png"),
};
