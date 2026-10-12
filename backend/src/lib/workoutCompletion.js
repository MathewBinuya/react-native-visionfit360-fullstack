// Pure decision logic for "mark a workout complete", shared by the controller and
// its tests. Kept DB-free so the idempotency / date-preservation rules that protect
// offline completions can be verified without a database.

// A client-supplied completion time is trusted only if it parses and isn't in the
// future (beyond small clock skew) — so an offline Monday workout stays on Monday
// when it finally syncs, without letting a bad clock land it in next week.
export const resolveCompletedAt = (value, now = new Date()) => {
  if (!value) return now;
  const t = new Date(value);
  if (isNaN(t.getTime())) return now;
  return t.getTime() > now.getTime() + 5 * 60 * 1000 ? now : t;
};

// Decide what to do given the already-loaded workout (or null) and the request body.
// Returns one of:
//   { kind: "not_found" }                      — no such workout for this user
//   { kind: "idempotent", reason }             — already complete; return it unchanged
//   { kind: "apply", set: { completed, completedAt, clientCompletionId? } }
// The controller performs the DB read/write; this function owns the rules.
export const planCompletion = ({ workout, body = {}, now = new Date() }) => {
  const { completedAt, clientCompletionId } = body;

  if (!workout) return { kind: "not_found" };

  // Already done — idempotent. Never re-stamp completedAt (that would move an
  // offline Monday workout to the Tuesday it synced) and never re-count it.
  if (workout.completed) return { kind: "idempotent", reason: "already_completed" };

  const set = {
    completed: true,
    completedAt: resolveCompletedAt(completedAt, now),
  };
  if (clientCompletionId) set.clientCompletionId = clientCompletionId;
  return { kind: "apply", set };
};
