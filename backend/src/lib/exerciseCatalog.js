// Exercises VisionFit supports (RepVision AR + tracker). Keep in sync with
// mobile/lib/exercises.js — `name` is the mobile `label`, `key` the AR key.
// `kind`: "weighted" = can be loaded with dumbbells/barbell, "bodyweight", "cardio".
export const EXERCISE_CATALOG = [
  { key: "squat",           name: "Squats",           group: "Legs",      kind: "bodyweight", impact: "low"  },
  { key: "sumosquat",       name: "Sumo Squats",      group: "Legs",      kind: "bodyweight", impact: "low"  },
  { key: "sidelegraise",    name: "Side Leg Raises",  group: "Legs",      kind: "bodyweight", impact: "low"  },
  { key: "deadlift",        name: "Deadlift",         group: "Legs",      kind: "weighted",   impact: "low"  },
  { key: "bicepcurl",       name: "Bicep Curls",      group: "Arms",      kind: "weighted",   impact: "low"  },
  { key: "tricepextension", name: "Tricep Extension", group: "Arms",      kind: "weighted",   impact: "low"  },
  { key: "lateralraise",    name: "Lateral Raises",   group: "Shoulders", kind: "weighted",   impact: "low"  },
  { key: "frontraise",      name: "Front Raises",     group: "Shoulders", kind: "weighted",   impact: "low"  },
  { key: "shoulderpress",   name: "Shoulder Press",   group: "Shoulders", kind: "weighted",   impact: "low"  },
  { key: "pushup",          name: "Push-ups",         group: "Chest",     kind: "bodyweight", impact: "low"  },
  { key: "kneeraise",       name: "Knee Raises",      group: "Core",      kind: "bodyweight", impact: "low"  },
  { key: "sidebend",        name: "Side Bends",       group: "Core",      kind: "bodyweight", impact: "low"  },
  { key: "jumpingjack",     name: "Jumping Jacks",    group: "Cardio",    kind: "cardio",     impact: "high" },
  { key: "highknees",       name: "High Knees",       group: "Cardio",    kind: "cardio",     impact: "high" },
];

export const CATALOG_NAMES = EXERCISE_CATALOG.map((e) => e.name);

const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

// Map a free-form / AI-produced name (or an AR key like "bicepcurl") to the
// canonical catalog name, or null if it isn't a supported exercise.
export const canonicalExerciseName = (name) => {
  const k = squash(name);
  if (!k) return null;
  const hit = EXERCISE_CATALOG.find(
    (e) => squash(e.name) === k || e.key === k || squash(e.name).replace(/s$/, "") === k.replace(/s$/, "")
  );
  return hit ? hit.name : null;
};

export const catalogPromptLines = () =>
  EXERCISE_CATALOG.map(
    (e) => `- ${e.name} (${e.group}; ${e.kind === "weighted" ? "can use dumbbells/barbell" : e.kind}${e.impact === "high" ? ", high-impact" : ""})`
  ).join("\n");
