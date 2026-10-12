// Offline-first engine for the Workout Tracker.
//
// Principle: local storage provides offline availability and a temporary pending
// state; the backend/database stays the permanent source of truth. The only write
// that is queued offline is "mark complete" — creating/editing/deleting routines
// stays online (those have no offline dedup/streak semantics to honour). Completed
// workouts flow:  tap Complete → save locally → online → sync → backend → the
// existing analytics/streak/volume pipeline (unchanged) derives everything from the
// synced Workout document.
//
// Storage keys are scoped per account so switching users never mixes data.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./axios";
import { drainQueue, classifyError, hideCompletedOffline, mergeHistory } from "./offlineSyncCore";

export { mergeHistory }; // re-exported for screens (history.jsx)

const CACHE_PREFIX = "workoutsCache:v1:";       // last server list of active (completed=false) routines
const PENDING_PREFIX = "pendingWorkoutSync:v1:"; // queue of offline completions awaiting upload

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

// ---- raw storage helpers (never throw; storage can be unavailable) --------------
const readJSON = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore — a failed cache write only costs a refetch */
  }
};

export const getPending = (user) => readJSON(pendingKey(user), []);
const setPending = (user, list) => writeJSON(pendingKey(user), list);
const getCache = (user) => readJSON(cacheKey(user), []);
const setCache = (user, list) => writeJSON(cacheKey(user), list);

// ---- connectivity hint (no NetInfo dependency) ---------------------------------
// Updated from every load/sync outcome so the UI can show a subtle Offline pill
// without us making an extra probe request.
let _lastOnline = true;
export const getLastOnline = () => _lastOnline;

// Load the active (completed=false) routines. Online: fetch, cache, return. Offline
// (network error): fall back to the cache. Either way, workouts already completed
// offline are filtered out so they never show as still-to-do.
export const loadActiveWorkouts = async (user) => {
  const pending = await getPending(user);
  try {
    const res = await api.get("/workouts?completed=false");
    _lastOnline = true;
    await setCache(user, res.data);
    return { workouts: hideCompletedOffline(res.data, pending), online: true, fromCache: false, pending };
  } catch (err) {
    if (!isNetworkError(err)) throw err; // real server/auth error — let the caller surface it
    _lastOnline = false;
    const cached = await getCache(user);
    return { workouts: hideCompletedOffline(cached, pending), online: false, fromCache: true, pending };
  }
};

// Build the body the backend's PATCH /workouts/:id/complete expects. completedAt is
// captured at tap time so an offline Monday workout counts as Monday after it syncs.
const completionBody = (item) => ({
  completedAt: item.completedAt,
  clientCompletionId: item.clientCompletionId,
});

// Mark a workout complete. Online → PATCH now, drop it from the active cache, done.
// Offline → store a pending completion (with a stable sync id + the real timestamp)
// and still drop it from the active cache so the UI reflects it immediately.
export const completeWorkout = async (user, workout) => {
  const item = {
    opId: makeSyncId(),
    type: "complete",
    workoutId: workout._id,
    clientCompletionId: makeSyncId(),
    completedAt: new Date().toISOString(),
    // snapshot for offline history display only — never sent as a new record
    snapshot: {
      title: workout.title,
      date: workout.date,
      exercises: workout.exercises,
    },
    tries: 0,
    lastError: null,
  };

  // remove from the cached active list up front (optimistic, survives app restart)
  const cache = await getCache(user);
  await setCache(user, (cache || []).filter((w) => w._id !== workout._id));

  try {
    const res = await api.patch(`/workouts/${workout._id}/complete`, completionBody(item));
    _lastOnline = true;
    return { status: "synced", workout: res.data };
  } catch (err) {
    if (!isNetworkError(err)) {
      // Server reached but refused (e.g. 500). Still never lose the completion —
      // queue it and let sync resolve it later. (401 is handled by the axios
      // interceptor, which logs out before we get here.)
      item.lastError = err.response?.status || "error";
    } else {
      _lastOnline = false;
    }
    const pending = await getPending(user);
    pending.push(item);
    await setPending(user, pending);
    return { status: "pending", item };
  }
};

// ---- sync queue -----------------------------------------------------------------
// A single in-flight guard so app-start, resume and tracker-open can all call
// syncPending() without ever uploading the same completion twice concurrently.
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

// Drain the pending queue. Removes only items the backend confirms; keeps the rest
// for a later retry. Idempotent by design: the backend recognises an already-synced
// completion (same workout id / clientCompletionId) and returns it without
// double-counting, so retries after a dropped response are safe.
export const syncPending = async (user) => {
  if (_syncing) return _syncing; // coalesce concurrent callers
  _syncing = (async () => {
    const pending = await getPending(user);
    if (!pending.length) return { ran: false, synced: 0, remaining: 0 };

    // The backend is idempotent (same workout id / clientCompletionId is never
    // counted twice), so an "ok" here is safe even if a previous pass already
    // applied it but we lost the response.
    const attempt = async (item) => {
      try {
        await api.patch(`/workouts/${item.workoutId}/complete`, completionBody(item));
        _lastOnline = true;
        return "ok";
      } catch (err) {
        const outcome = classifyError(err);
        if (outcome === "offline") _lastOnline = false;
        return outcome;
      }
    };

    const { keep, synced } = await drainQueue(pending, attempt);
    await setPending(user, keep);
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

// Pending completions shaped like completed Workout documents, for the local
// History view while offline / before sync. Marked so the UI can badge them and so
// they are never confused with server records.
export const getPendingAsHistory = async (user) => {
  const pending = await getPending(user);
  return pending.map((p) => ({
    _id: `pending:${p.opId}`,
    _pending: true,
    clientCompletionId: p.clientCompletionId,
    title: p.snapshot?.title,
    date: p.snapshot?.date,
    completedAt: p.completedAt,
    exercises: p.snapshot?.exercises || [],
  }));
};
