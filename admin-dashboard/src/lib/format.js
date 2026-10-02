// Display helpers for the admin dashboard.

// AR exercise key -> human label (mirrors mobile/lib/exercises.js). Manual/free-text
// workout names that aren't keys fall through to a title-cased version of the raw name.
const EXERCISE_LABELS = {
  squat: "Squats",
  bicepcurl: "Bicep Curls",
  lateralraise: "Lateral Raises",
  shoulderpress: "Shoulder Press",
  jumpingjack: "Jumping Jacks",
  highknees: "High Knees",
  frontraise: "Front Raises",
  sidelegraise: "Side Leg Raises",
  kneeraise: "Knee Raises",
  tricepextension: "Tricep Extension",
  sumosquat: "Sumo Squats",
  sidebend: "Side Bends",
  deadlift: "Deadlift",
  pushup: "Push-ups",
};

export const exerciseLabel = (name) => {
  if (!name) return "Unknown";
  const key = String(name).toLowerCase();
  if (EXERCISE_LABELS[key]) return EXERCISE_LABELS[key];
  // title-case the raw name for manual workouts
  return String(name)
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// "just now", "2 min ago", "3 h ago", "5 d ago", or a date; null -> "Never"
export const relativeTime = (value) => {
  if (!value) return "Never";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "Never";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} d ago`;
  return new Date(value).toLocaleDateString();
};

export const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

export const dateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

// presence status -> { label, className }
export const PRESENCE_META = {
  active: { label: "Active", className: "badge-presence-active" },
  recently_active: { label: "Recently active", className: "badge-presence-recent" },
  inactive: { label: "Inactive", className: "badge-presence-inactive" },
};

export const presenceMeta = (status) => PRESENCE_META[status] || PRESENCE_META.inactive;

// compute age from a date-of-birth string
export const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
};

// compute BMI + category from height/weight (same thresholds as the backend)
export const bmiInfo = (heightCm, weightKg) => {
  if (!heightCm || !weightKg) return null;
  const h = heightCm / 100;
  const bmi = +(weightKg / (h * h)).toFixed(1);
  let category = "Obese";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  return { bmi, category };
};

export const displayName = (u) => u?.name || u?.username || "Unknown user";

// Automatic account status: logged in within the last N days -> Active, else Inactive.
// Based on the existing lastLoginAt field — no separate status system. Tunable.
export const ACCOUNT_ACTIVE_DAYS = 7;

export const accountStatus = (lastLoginAt, days = ACCOUNT_ACTIVE_DAYS) => {
  const active =
    !!lastLoginAt && Date.now() - new Date(lastLoginAt).getTime() <= days * 24 * 60 * 60 * 1000;
  return active
    ? { active: true, label: "Active", className: "badge-presence-active" }
    : { active: false, label: "Inactive", className: "badge-presence-inactive" };
};
