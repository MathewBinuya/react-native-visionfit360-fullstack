// Server-side validation + sanitisation for workout create/update payloads.
//
// The mobile app validates input too, but offline-created/edited workouts are
// REPLAYED from a device queue that may have been built by an older app version
// (or tampered with), so the server must never trust the client's word. This is
// the authoritative check. Kept pure (no DB/Express) so it is unit-testable and
// shared by createWorkout + updateWorkout.

export const MAX_REPS = 100;
export const MAX_WEIGHT_KG = 1000;
export const MAX_REST_SECONDS = 3600;
export const MAX_SETS_PER_EXERCISE = 20;
export const MAX_EXERCISES = 50;
export const MAX_TITLE_LEN = 120;
export const MAX_NAME_LEN = 120;
export const MAX_NOTES_LEN = 2000;

// Coerce to a finite number within [0, max]; anything else becomes `fallback`.
const clampNum = (value, max, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n > max ? max : n;
};

// Returns { ok: true, value } with a cleaned exercises array, or { ok: false, message }.
// `value` is safe to persist: numbers clamped, strings trimmed/bounded, unknown
// fields on sets/exercises dropped (never spread blindly into the document).
export const sanitizeExercises = (exercises) => {
  if (!Array.isArray(exercises)) return { ok: false, message: "exercises must be an array" };
  if (exercises.length === 0) return { ok: false, message: "At least one exercise is required" };
  if (exercises.length > MAX_EXERCISES) return { ok: false, message: `Too many exercises (max ${MAX_EXERCISES})` };

  const clean = [];
  for (const ex of exercises) {
    const name = typeof ex?.name === "string" ? ex.name.trim() : "";
    if (!name) return { ok: false, message: "Each exercise needs a name" };
    if (name.length > MAX_NAME_LEN) return { ok: false, message: `Exercise name too long (max ${MAX_NAME_LEN})` };

    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    if (sets.length > MAX_SETS_PER_EXERCISE) {
      return { ok: false, message: `"${name}" has too many sets (max ${MAX_SETS_PER_EXERCISE})` };
    }

    clean.push({
      name: name.slice(0, MAX_NAME_LEN),
      sets: sets.map((s) => ({
        reps: clampNum(s?.reps, MAX_REPS),
        weightKg: clampNum(s?.weightKg, MAX_WEIGHT_KG),
        restSeconds: clampNum(s?.restSeconds, MAX_REST_SECONDS, 60),
        completed: s?.completed === true,
      })),
    });
  }
  return { ok: true, value: clean };
};

// Validate + build the persistable field set from a create/update body. `partial`
// (update) only checks/keeps the fields that are present. Ownership and completion
// state are NEVER taken from here — the caller sets `user`, and completion flows
// through PATCH /:id/complete. Returns { ok, value } or { ok: false, message }.
export const buildWorkoutFields = (body = {}, { partial = false } = {}) => {
  const out = {};

  if (body.title !== undefined || !partial) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return { ok: false, message: "A title is required" };
    out.title = title.slice(0, MAX_TITLE_LEN);
  }

  if (body.date !== undefined) {
    const d = new Date(body.date);
    if (isNaN(d.getTime())) return { ok: false, message: "Invalid date" };
    out.date = d;
  }

  if (body.exercises !== undefined || !partial) {
    const res = sanitizeExercises(body.exercises);
    if (!res.ok) return res;
    out.exercises = res.value;
  }

  if (body.durationMinutes !== undefined) {
    out.durationMinutes = clampNum(body.durationMinutes, 24 * 60);
  }

  if (body.notes !== undefined) {
    out.notes = typeof body.notes === "string" ? body.notes.slice(0, MAX_NOTES_LEN) : "";
  }

  return { ok: true, value: out };
};
