// Fitness goal options — keep the keys in sync with the backend user.model enum
// and the aiController GOAL_GUIDANCE map.
export const GOALS = [
  {
    key: "get_fit",
    label: "Get Fit",
    desc: "General strength, cardio, mobility and consistency.",
    icon: "flame-outline",
  },
  {
    key: "maintain_weight",
    label: "Maintain Weight",
    desc: "Sustainable activity with balanced strength and cardio.",
    icon: "fitness-outline",
  },
  {
    key: "get_lean",
    label: "Get Lean / Ripped",
    desc: "Resistance training and progressive overload toward body composition.",
    icon: "barbell-outline",
  },
];

export const goalLabel = (key) => GOALS.find((g) => g.key === key)?.label || "";
