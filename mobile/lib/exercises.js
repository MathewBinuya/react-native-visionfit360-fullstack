// AR_EXERCISES — the SINGLE source of truth for every RepVision exercise.
// `key` is the only identifier (never match by `label`). Keys match the
// detector registry in assets/posedetect.html.
//
// Optional tutorial fields (added for the in-app guide):
//   instructions: string[]   // 3-6 numbered steps describing the counted movement
//   equipment: string        // e.g. "Bodyweight", "Dumbbells (optional)"
//   ascend?: { id, approx? }   // AscendAPI (ExerciseDB) exerciseId for the live demo GIF
//
// Demo media: resolved ONCE by hand at development time (each ID verified by
// viewing its animation). Only the stable ID is stored — the GIF URL is fetched
// live every time (lib/exerciseDemo.js) because the free tier forbids caching.
// approx: true = closest available AscendAPI movement (the guide says so).
// FREE TIER = DEMO / NON-COMMERCIAL, attribution required. Publishing or
// monetising the app needs a paid AscendAPI plan. No mapping → "Demo coming soon".

export const AR_EXERCISES = [
  {
    key: "squat",
    label: "Squats",
    group: "Legs",
    target: ["Quads", "Glutes", "Hamstrings"],
    icon: "body-outline",
    targetReps: 10,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: dumbbell squat — same movement, holding dumbbells
    ascend: { id: "HsvHqgf", approx: true },
    instructions: [
      "Stand tall with feet shoulder-width apart, full body in frame.",
      "Push your hips back and bend your knees to lower down.",
      "Stop when your thighs are about parallel to the floor.",
      "Drive through your heels to stand back up to complete the rep.",
    ],
    tips: [
      "Stand at a 45° angle to your camera",
      "Step back so your full body (head to feet) is visible",
      "Keep your back straight as you lower down",
      "Bend until your thighs are about parallel to the floor",
    ],
  },
  {
    key: "bicepcurl",
    label: "Bicep Curls",
    group: "Arms",
    target: ["Biceps"],
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
    equipment: "Dumbbells (optional)",
    // AscendAPI: dumbbell standing biceps curl
    ascend: { id: "3s4NnTh" },
    instructions: [
      "Face the camera, arm hanging straight down and clearly visible.",
      "Keep your upper arm pinned to your side — only the forearm moves.",
      "Curl your hand up toward your shoulder.",
      "Lower all the way back to full extension to count the rep.",
    ],
    tips: [
      "Face the camera with your arm clearly visible",
      "Keep your upper arm still — only your forearm moves",
      "Curl all the way up, then fully extend down",
    ],
  },
  {
    key: "lateralraise",
    label: "Lateral Raises",
    group: "Shoulders",
    target: ["Side Delts"],
    icon: "body-outline",
    targetReps: 12,
    working: true,
    equipment: "Dumbbells (optional)",
    // AscendAPI: dumbbell lateral raise
    ascend: { id: "DsgkuIt" },
    instructions: [
      "Face the camera, arms resting at your sides.",
      "Raise both arms out to the sides up to shoulder height.",
      "Keep a slight bend in your elbows, palms facing down.",
      "Lower slowly back to your sides to complete the rep.",
    ],
    tips: [
      "Face the camera, arms at your sides",
      "Raise both arms out to the sides to shoulder height",
      "Lower slowly with control",
    ],
  },
  {
    key: "shoulderpress",
    label: "Shoulder Press",
    group: "Shoulders",
    target: ["Shoulders", "Triceps"],
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
    equipment: "Dumbbells (optional)",
    // AscendAPI: dumbbell standing overhead press
    ascend: { id: "A6wtbuL" },
    instructions: [
      "Face the camera, hands at shoulder height with elbows bent.",
      "Press both hands straight up until your arms are fully extended overhead.",
      "Pause briefly at the top.",
      "Lower back to shoulder height to count the rep.",
    ],
    tips: [
      "Face the camera, hands starting at shoulder height",
      "Press straight up overhead until arms are extended",
      "Lower back to your shoulders",
    ],
  },
  {
    key: "jumpingjack",
    label: "Jumping Jacks",
    group: "Cardio",
    target: ["Full Body", "Cardio"],
    icon: "body-outline",
    targetReps: 20,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: demo removed on request — guide shows "Demo coming soon"
    instructions: [
      "Step back so your whole body is in frame.",
      "Start with feet together and arms at your sides.",
      "Jump your feet apart while raising both arms overhead.",
      "Jump back to the start position to complete one rep.",
    ],
    tips: [
      "Step back so your whole body is visible",
      "Jump arms overhead AND feet apart together",
      "Return arms down and feet together to complete a rep",
    ],
  },
  {
    key: "highknees",
    label: "High Knees",
    group: "Cardio",
    target: ["Hip Flexors", "Cardio"],
    icon: "body-outline",
    targetReps: 20,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: high knee against wall — same knee drive, with wall support
    ascend: { id: "ealLwvX", approx: true },
    instructions: [
      "Step back so your hips and knees are visible.",
      "Drive one knee up toward hip height.",
      "Quickly switch and drive the other knee up.",
      "Keep a steady, controlled running-in-place rhythm.",
    ],
    tips: [
      "Step back so your hips and knees are visible",
      "Drive each knee up toward hip height",
      "Keep a steady, controlled pace",
    ],
  },
  {
    key: "frontraise",
    label: "Front Raises",
    group: "Shoulders",
    target: ["Front Delts"],
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
    equipment: "Dumbbells (optional)",
    // AscendAPI: dumbbell front raise
    ascend: { id: "3eGE2JC" },
    instructions: [
      "Face the camera with your arm straight down and visible.",
      "Keep your elbow straight the whole time.",
      "Raise your arm straight out in front to shoulder height.",
      "Lower it back down with control to count the rep.",
    ],
    tips: [
      "Face the camera with a straight arm",
      "Raise your arm straight forward to shoulder height",
      "Keep your elbow straight the whole time",
    ],
  },
  {
    key: "sidelegraise",
    label: "Side Leg Raises",
    group: "Legs",
    target: ["Glute Medius", "Outer Thighs"],
    icon: "body-outline",
    targetReps: 12,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: no standing side leg raise in AscendAPI (only lying/seated/machine) — demo intentionally unset
    instructions: [
      "Face the camera with your full body in frame.",
      "Keep your torso upright and your standing leg steady.",
      "Lift one leg out to the side, clearly off the floor.",
      "Lower it fully back down before the next rep.",
    ],
    tips: [
      "Face the camera, full body visible",
      "Lift one leg out to the side, clearly off the ground",
      "Lower it fully before raising again",
    ],
  },
  {
    key: "kneeraise",
    label: "Knee Raises",
    group: "Core",
    target: ["Lower Abs", "Hip Flexors"],
    icon: "body-outline",
    targetReps: 12,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: high knee against wall — standing knee-to-chest drive
    ascend: { id: "ealLwvX", approx: true },
    instructions: [
      "Stand at a 45° angle so the camera sees your side.",
      "Lift the knee nearest the camera up toward your chest.",
      "Lower your foot back to the floor.",
      "Turn to face the other way to switch legs.",
    ],
    tips: [
      "Stand at a 45° angle to the camera",
      "Lift the knee facing the camera up toward your chest",
      "Turn to the other side to switch legs",
    ],
  },
  {
    key: "tricepextension",
    label: "Tricep Extension",
    group: "Arms",
    target: ["Triceps"],
    icon: "barbell-outline",
    targetReps: 12,
    working: true,
    equipment: "Dumbbells (optional)",
    // AscendAPI: barbell standing overhead triceps extension — same two-arm overhead movement
    ascend: { id: "dZl9Q27", approx: true },
    instructions: [
      "Face the camera, hands behind your head, elbows bent and pointing up.",
      "Keep your upper arms still and close to your head.",
      "Extend your arms straight up overhead.",
      "Lower your hands back behind your head to count the rep.",
    ],
    tips: [
      "Face the camera, hands behind your head",
      "Extend your arms straight up overhead",
      "Lower back down behind your head",
    ],
  },
  {
    key: "sumosquat",
    label: "Sumo Squats",
    group: "Legs",
    target: ["Inner Thighs", "Glutes"],
    icon: "body-outline",
    targetReps: 12,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: barbell wide squat — wide stance, toes out
    ascend: { id: "s7HX1BY", approx: true },
    instructions: [
      "Stand with feet wider than shoulder-width, toes turned out.",
      "Step back so your full body is in frame.",
      "Bend your knees and lower straight down, keeping your back straight.",
      "Drive through your heels to stand tall and complete the rep.",
    ],
    tips: [
      "Stand at a 45° angle, feet wider than shoulders",
      "Step back so your full body is visible",
      "Lower down keeping your back straight",
    ],
  },
  {
    key: "sidebend",
    label: "Side Bends",
    group: "Core",
    target: ["Obliques"],
    icon: "body-outline",
    targetReps: 12,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: dumbbell side bend — standing side bend, holding a dumbbell
    ascend: { id: "IpONWYv", approx: true },
    instructions: [
      "Face the camera with your upper body visible.",
      "Keep your hips facing forward — don't twist.",
      "Lean your torso straight down to one side.",
      "Return to upright to complete the rep (the app tracks your shoulder-line tilt).",
    ],
    tips: [
      "Face the camera, upper body visible",
      "Lean your torso to one side, then back to center",
      "Keep the movement slow and controlled",
    ],
  },
  {
    key: "deadlift",
    label: "Deadlift",
    group: "Legs", // was "Lower Body"
    target: ["Hamstrings", "Glutes", "Lower Back"],
    icon: "barbell-outline",
    targetReps: 8,
    working: true,
    equipment: "Barbell (or dumbbells)",
    // AscendAPI: barbell deadlift
    ascend: { id: "ila4NZS" },
    instructions: [
      "Turn side-on to the camera so your head-to-feet are visible.",
      "Stand tall for a moment so the app can calibrate your upright posture.",
      "Feet hip-width apart; hinge at the hips with a flat back to lower.",
      "Keep the bar close to your body on the way down.",
      "Drive through your heels to stand tall and squeeze your glutes at the top.",
    ],
    tips: [
      "Stand at 45° to your phone — your side should face the camera.",
      "Feet hip-width apart, bar over mid-foot.",
      "Hinge at the hips, keep your back flat and chest up.",
      "Drive through your heels to stand tall — squeeze glutes at the top.",
      "Lower the bar with control, keeping it close to your body.",
      "Good lighting and full body in frame helps tracking.",
    ],
  },
  {
    key: "pushup",
    label: "Push-ups",
    group: "Chest",
    target: ["Chest", "Triceps", "Shoulders"],
    icon: "fitness-outline",
    targetReps: 10,
    working: true,
    equipment: "Bodyweight",
    // AscendAPI: push-up
    ascend: { id: "I4hDWkc" },
    instructions: [
      "Position side-on at ~45° so your arm and torso are visible.",
      "Start in a plank with your arms extended.",
      "Lower your chest until your elbows bend to about 90°.",
      "Push back up to full arm extension to count the rep.",
    ],
    tips: [
      "Position at a 45° angle so your arm is visible",
      "Lower until your elbows bend to about 90°",
      "Push back up to full arm extension",
    ],
  },
];
