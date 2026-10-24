// Pure, dependency-free core for the offline workout queue. No React Native,
// storage or network imports, so every rule here is directly unit-testable.
// offlineWorkouts.js supplies the real HTTP `attempt` and persistence; this owns:
//   - the queue "op" model and how a new op collapses into the pending queue,
//   - how a raw HTTP error maps to a sync outcome,
//   - how pending ops are projected onto the active (to-do) list for display.
//
// An op is one queued change to a workout:
//   { opId, type: "create"|"update"|"delete"|"complete",
//     clientWorkoutId?, workoutId?, payload?, snapshot?, tries, lastError }
// Every op that touches an offline-born workout carries its clientWorkoutId; ops
// on a server-born workout carry its real workoutId. `identity()` unifies the two
// so collapsing and projection work regardless of whether a workout has synced.

export const identity = (op) => op?.clientWorkoutId || op?.workoutId || null;

const sameTarget = (a, b) => identity(a) && identity(a) === identity(b);

// A local (not-yet-synced) workout id. Offline-created workouts get one of these
// as their `_id` until a create op syncs and the server assigns a real ObjectId.
export const LOCAL_ID_PREFIX = "local:";
export const isLocalId = (id) => typeof id === "string" && id.startsWith(LOCAL_ID_PREFIX);

// Fold a new op into the pending queue, keeping it minimal and consistent so we
// never send the server redundant or impossible work. Returns a NEW array.
//
//   create                        → append.
//   update on a queued create     → merge into that create's payload (no new op).
//   update otherwise              → replace any earlier pending update (last wins).
//   delete of a queued create     → drop the create and every op for it; send
//                                   nothing (the workout never reached the server).
//   delete otherwise              → drop pending update/complete for it, then append
//                                   a single delete.
//   complete                      → replace any earlier pending complete for it.
export const enqueueOp = (queue, op) => {
  const q = Array.isArray(queue) ? queue : [];

  if (op.type === "create") return [...q, op];

  const hasCreate = q.some((o) => o.type === "create" && sameTarget(o, op));

  if (op.type === "update") {
    if (hasCreate) {
      // Fold the edit into the pending creation — the create carries latest fields.
      return q.map((o) =>
        o.type === "create" && sameTarget(o, op)
          ? { ...o, payload: { ...o.payload, ...op.payload } }
          : o
      );
    }
    const withoutOldUpdate = q.filter((o) => !(o.type === "update" && sameTarget(o, op)));
    return [...withoutOldUpdate, op];
  }

  if (op.type === "delete") {
    if (hasCreate) {
      // Created and deleted before ever syncing → erase it from the queue entirely.
      return q.filter((o) => !sameTarget(o, op));
    }
    const pruned = q.filter(
      (o) => !((o.type === "update" || o.type === "complete" || o.type === "delete") && sameTarget(o, op))
    );
    return [...pruned, op];
  }

  if (op.type === "complete") {
    const withoutOldComplete = q.filter((o) => !(o.type === "complete" && sameTarget(o, op)));
    return [...withoutOldComplete, op];
  }

  return [...q, op];
};

// Map an axios-style error to a sync outcome for a given op type.
//   "offline"   — no HTTP response (DNS/timeout/airplane mode): stop, keep in order.
//   "ok"        — treated as success (e.g. deleting something already gone).
//   "permanent" — the server refused and a retry can't help (4xx): drop the op.
//   "retry"     — transient (5xx / unknown): keep for a later pass.
// 401 never reaches here — the axios interceptor logs out first.
export const classifyOutcome = (err, type) => {
  if (!err?.response) return "offline";
  const status = err.response.status;
  // A delete whose target is already gone has achieved its goal.
  if (type === "delete" && status === 404) return "ok";
  if (status >= 400 && status < 500) return "permanent";
  return "retry";
};

// Project the pending queue onto a server list of active (completed=false)
// workouts, producing exactly what the user should see while things are unsynced:
//   - workouts with a pending delete or complete are hidden,
//   - pending updates are applied to the matching server workout,
//   - offline-created workouts are shown (badged _pending) with a local id,
//     unless a later delete/complete already removed/finished them.
// Pure: returns a new array, inputs untouched.
export const applyPendingToActive = (serverList, queue) => {
  const q = Array.isArray(queue) ? queue : [];

  const removed = new Set(); // identities hidden from the to-do list
  const updates = new Map(); // identity -> merged update payload
  const creates = [];        // create ops still live (not deleted/completed)

  for (const op of q) {
    const id = identity(op);
    if (!id) continue;
    if (op.type === "delete" || op.type === "complete") removed.add(id);
    if (op.type === "update") updates.set(id, { ...(updates.get(id) || {}), ...op.payload });
    if (op.type === "create") creates.push(op);
  }

  const matchesRemoved = (w) => removed.has(w._id) || (w.clientWorkoutId && removed.has(w.clientWorkoutId));
  const updateFor = (w) => updates.get(w._id) || (w.clientWorkoutId && updates.get(w.clientWorkoutId));

  const fromServer = (serverList || [])
    .filter((w) => !matchesRemoved(w))
    .map((w) => {
      const u = updateFor(w);
      return u ? { ...w, ...u } : w;
    });

  const fromCreates = creates
    .filter((op) => !removed.has(op.clientWorkoutId))
    .map((op) => ({
      _id: `${LOCAL_ID_PREFIX}${op.clientWorkoutId}`,
      clientWorkoutId: op.clientWorkoutId,
      _pending: true, // UI badge: created offline, not yet synced
      completed: false,
      ...op.payload,
    }));

  // Newest-created first among locals, then the server list.
  return [...fromCreates.reverse(), ...fromServer];
};

// Merge server history with still-pending offline completions, de-duplicated by
// clientCompletionId so a record that synced between fetches never shows twice.
export const mergeHistory = (serverList, pendingItems) => {
  const seen = new Set((serverList || []).map((w) => w.clientCompletionId).filter(Boolean));
  const extras = (pendingItems || []).filter((p) => !seen.has(p.clientCompletionId));
  return [...extras, ...(serverList || [])];
};
