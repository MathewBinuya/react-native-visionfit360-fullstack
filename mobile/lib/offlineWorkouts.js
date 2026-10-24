// Offline-first engine for the Workout Tracker.
//
// Principle: local storage provides offline availability and a temporary pending
// state; the backend/database stays the permanent source of truth. Create, edit,
// delete and complete all work offline — each is captured as an "op" in a per-user
// queue and replayed, in order, when connectivity returns. Flow:
//   do something → try the server → offline? queue the op + reflect it locally →
//   back online → drain the queue → backend → the existing analytics/streak/volume
//   pipeline (unchanged) derives everything from the synced Workout documents.
//
// Safety guarantees:
//   - nothing is lost: an op that can't reach the server is persisted first; if the
//     device write itself fails, the caller is told (never a false "saved").
//   - nothing is duplicated: creates carry a clientWorkoutId and completions a
//     clientCompletionId, both idempotency keys the backend recognises, so retries
//     after a dropped response never create/count anything twice.
//   - ordering + dependencies: ops drain in order; an offline-created workout's
//     real server id is resolved before any edit/delete/complete that depends on it.
//
// Storage keys are scoped per account so switching users never mixes data.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./axios";
import {
  enqueueOp,
  classifyOutcome,
  applyPendingToActive,
  mergeHistory,
  isLocalId,
  LOCAL_ID_PREFIX,
} from "./offlineSyncCore";

export { mergeHistory, isLocalId }; // re-exported for screens

const CACHE_PREFIX = "workoutsCache:v1:";        // last server list of active (completed=false) routines
const PENDING_PREFIX = "pendingWorkoutSync:v1:"; // queue of offline ops awaiting upload

const uid = (user) => String(user?.id || user?._id || "anon");
const cacheKey = (user) => CACHE_PREFIX + uid(user);
const pendingKey = (user) => PENDING_PREFIX + uid(user);

// RFC4122-ish v4 id. Math.random is plenty for a client dedup token — the backend
// treats it as an opaque idempotency key, not a secret.
export const makeSyncId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

// A failure with no HTTP response is a connectivity problem (DNS/timeout/offline).
// Anything with a response means the server was reached.
const isNetworkError = (err) => !err?.response;

// The clientWorkoutId for a workout: explicit field, or recovered from a local id.
const clientIdOf = (workout) =>
  workout?.clientWorkoutId || (isLocalId(workout?._id) ? workout._id.slice(LOCAL_ID_PREFIX.length) : undefined);

// ---- raw storage helpers --------------------------------------------------------
const readJSON = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
// Lenient write — a failed cache write only costs a refetch, so it never throws.
const writeJSON = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export const getPending = (user) => readJSON(pendingKey(user), []);
const getCache = (user) => readJSON(cacheKey(user), []);
const setCache = (user, list) => writeJSON(cacheKey(user), list);

// Persist a new op into the pending queue. STRICT: if the device write fails there
// is nowhere to keep the change, so we throw and let the caller warn the user —
// we must never report "saved offline" when nothing was actually saved.
const enqueue = async (user, op) => {
  const queue = await getPending(user);
  const next = enqueueOp(queue, op);
  await AsyncStorage.setItem(pendingKey(user), JSON.stringify(next)); // may throw
  return next;
};

// ---- connectivity hint (no NetInfo dependency) ---------------------------------
let _lastOnline = true;
export const getLastOnline = () => _lastOnline;

// Load the active (completed=false) routines, with every pending op projected on
// top: offline-created workouts appear, edits are applied, deleted/completed ones
// are hidden. Online: fetch + cache. Offline (network error): fall back to cache.
export const loadActiveWorkouts = async (user) => {
  const queue = await getPending(user);
  try {
    const res = await api.get("/workouts?completed=false");
    _lastOnline = true;
    await setCache(user, res.data);
    return { workouts: applyPendingToActive(res.data, queue), online: true, fromCache: false, pending: queue };
  } catch (err) {
    if (!isNetworkError(err)) throw err; // real server/auth error — let the caller surface it
    _lastOnline = false;
    const cached = await getCache(user);
    return { workouts: applyPendingToActive(cached, queue), online: false, fromCache: true, pending: queue };
  }
};

// ---- writes (each: try server, else queue) -------------------------------------
// All four return { status: "synced" | "pending", workout? }. A thrown error means
// a real server rejection (surface it) OR a device-storage failure (warn the user).

// CREATE. A clientWorkoutId is generated up front and sent on every attempt, so
// even an ONLINE create whose response is lost can be retried via the queue without
// the backend inserting a second copy.
export const createWorkoutOffline = async (user, payload) => {
  const clientWorkoutId = makeSyncId();
  try {
    const res = await api.post("/workouts", { ...payload, clientWorkoutId });
    _lastOnline = true;
    return { status: "synced", workout: res.data };
  } catch (err) {
    if (!isNetworkError(err)) throw err; // validation/server error — not a connectivity issue
    _lastOnline = false;
    const op = { opId: makeSyncId(), type: "create", clientWorkoutId, payload, tries: 0, lastError: null };
    await enqueue(user, op);
    const workout = { _id: `${LOCAL_ID_PREFIX}${clientWorkoutId}`, clientWorkoutId, _pending: true, completed: false, ...payload };
    return { status: "pending", workout };
  }
};

// UPDATE. A not-yet-synced (local) workout never hits the server — the edit folds
// into its pending create. A server-born workout tries the server, then queues.
export const updateWorkoutOffline = async (user, workout, payload) => {
  if (!isLocalId(workout._id)) {
    try {
      const res = await api.put(`/workouts/${workout._id}`, payload);
      _lastOnline = true;
      return { status: "synced", workout: res.data };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      _lastOnline = false;
    }
  }
  const op = {
    opId: makeSyncId(),
    type: "update",
    clientWorkoutId: clientIdOf(workout),
    workoutId: isLocalId(workout._id) ? undefined : workout._id,
    payload,
    tries: 0,
    lastError: null,
  };
  await enqueue(user, op);
  return { status: "pending", workout: { ...workout, ...payload } };
};

// DELETE. A local workout is simply erased from the queue (it never reached the
// server). A server-born workout tries the server, then queues a delete.
export const deleteWorkoutOffline = async (user, workout) => {
  if (!isLocalId(workout._id)) {
    try {
      await api.delete(`/workouts/${workout._id}`);
      _lastOnline = true;
      return { status: "synced" };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      _lastOnline = false;
    }
  }
  const op = {
    opId: makeSyncId(),
    type: "delete",
    clientWorkoutId: clientIdOf(workout),
    workoutId: isLocalId(workout._id) ? undefined : workout._id,
    tries: 0,
    lastError: null,
  };
  await enqueue(user, op);
  return { status: "pending" };
};

const completionBody = (op) => ({
  completedAt: op.completedAt,
  clientCompletionId: op.clientCompletionId,
});

// COMPLETE. Online server-born workouts PATCH immediately. Anything else (offline,
// or an unsynced local workout) is queued; a completion is NEVER lost — even a
// server 500 falls through to the queue for a later, idempotent retry.
export const completeWorkout = async (user, workout) => {
  const op = {
    opId: makeSyncId(),
    type: "complete",
    clientWorkoutId: clientIdOf(workout),
    workoutId: isLocalId(workout._id) ? undefined : workout._id,
    clientCompletionId: makeSyncId(),
    completedAt: new Date().toISOString(),
    // snapshot for offline history display only — never sent as a new record
    snapshot: { title: workout.title, date: workout.date, exercises: workout.exercises },
    tries: 0,
    lastError: null,
  };

  if (!isLocalId(workout._id)) {
    try {
      const res = await api.patch(`/workouts/${workout._id}/complete`, completionBody(op));
      _lastOnline = true;
      return { status: "synced", workout: res.data };
    } catch (err) {
      if (!isNetworkError(err)) op.lastError = err.response?.status || "error";
      else _lastOnline = false;
      // fall through — queue it so the completion is never lost
    }
  }

  await enqueue(user, op);
  return { status: "pending", item: op };
};

// ---- sync queue -----------------------------------------------------------------
let _syncing = null;
const _listeners = new Set();

export const onSyncComplete = (fn) => {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
};
const emitSyncComplete = (result) => {
  for (const fn of _listeners) {
    try {
      fn(result);
    } catch {
      /* a listener must never break sync */
    }
  }
};

// Perform one op against the backend. For a create it records the server id under
// the op's clientWorkoutId so later ops in the same pass can target the real
// document. Returns a classifyOutcome token ("ok"/"offline"/"permanent"/"retry").
const attemptOp = async (op, targetId, idMap) => {
  try {
    if (op.type === "create") {
      const res = await api.post("/workouts", { ...op.payload, clientWorkoutId: op.clientWorkoutId });
      if (op.clientWorkoutId && res?.data?._id) idMap[op.clientWorkoutId] = res.data._id;
      return "ok";
    }
    if (op.type === "update") {
      await api.put(`/workouts/${targetId}`, op.payload);
      return "ok";
    }
    if (op.type === "delete") {
      await api.delete(`/workouts/${targetId}`);
      return "ok";
    }
    if (op.type === "complete") {
      await api.patch(`/workouts/${targetId}/complete`, completionBody(op));
      return "ok";
    }
    return "permanent"; // unknown op type — drop it rather than loop forever
  } catch (err) {
    return classifyOutcome(err, op.type);
  }
};

// Drain the pending queue in order. Keeps only what must survive for a later pass;
// drops ops the server permanently refused (and the dependents of a create that
// permanently failed, since they could never succeed). On a connectivity failure
// it stops and preserves the rest of the queue in order.
export const syncPending = async (user) => {
  if (_syncing) return _syncing; // coalesce concurrent callers
  _syncing = (async () => {
    const queue = await getPending(user);
    if (!queue.length) return { ran: false, synced: 0, remaining: 0 };

    const idMap = {};         // clientWorkoutId -> real server _id (filled as creates sync)
    const failed = new Set(); // clientWorkoutIds whose create permanently failed
    const keep = [];
    let synced = 0;
    let stopped = false;

    for (const op of queue) {
      if (stopped) { keep.push(op); continue; }

      const cwid = op.clientWorkoutId;

      // Dependent of a create that can never succeed → drop it too.
      if (op.type !== "create" && cwid && failed.has(cwid)) continue;

      // Non-create ops need a real target id. If the owning create hasn't synced
      // yet this pass (e.g. it was kept for retry), keep this op for next time.
      const targetId = op.type === "create" ? null : (op.workoutId || (cwid ? idMap[cwid] : null));
      if (op.type !== "create" && !targetId) { keep.push(op); continue; }

      const outcome = await attemptOp(op, targetId, idMap);

      if (outcome === "offline") {
        _lastOnline = false;
        keep.push({ ...op, tries: (op.tries || 0) + 1 });
        stopped = true;
        continue;
      }
      if (outcome === "ok") { _lastOnline = true; synced++; continue; }
      if (outcome === "permanent") {
        if (op.type === "create" && cwid) failed.add(cwid); // its dependents can't succeed
        continue; // drop
      }
      // "retry" (5xx / unknown) — keep for a later pass.
      keep.push({ ...op, tries: (op.tries || 0) + 1 });
    }

    await writeJSON(pendingKey(user), keep);
    return { ran: true, synced, remaining: keep.length };
  })();

  try {
    const result = await _syncing;
    if (result.ran) emitSyncComplete(result);
    return result;
  } finally {
    _syncing = null;
  }
};

// Pending COMPLETIONS shaped like completed Workout documents, for the local
// History view while offline / before sync. Only "complete" ops are history;
// create/update/delete ops are to-do changes, surfaced on the active list instead.
export const getPendingAsHistory = async (user) => {
  const queue = await getPending(user);
  return queue
    .filter((op) => op.type === "complete")
    .map((p) => ({
      _id: `pending:${p.opId}`,
      _pending: true,
      clientCompletionId: p.clientCompletionId,
      title: p.snapshot?.title,
      date: p.snapshot?.date,
      completedAt: p.completedAt,
      exercises: p.snapshot?.exercises || [],
    }));
};
