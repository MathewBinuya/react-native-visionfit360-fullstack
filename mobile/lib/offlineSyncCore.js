// Pure queue-draining algorithm for the offline sync, with no React Native or
// network imports so it can be unit-tested directly. offlineWorkouts.js supplies
// the real `attempt` (an axios call) and persistence; this owns the keep/drop/stop
// rules that decide which pending completions survive a sync pass.
//
// `attempt(item)` resolves to one of:
//   "ok"      — backend confirmed (new completion OR idempotent already-complete)
//   "offline" — connectivity failure; stop now, keep this item and everything after
//   "drop"    — permanent failure (e.g. 404: workout deleted); discard this item
//   "retry"   — transient failure (e.g. 5xx); keep this item, continue to the next
//
// Returns { keep, synced }. Items are processed in order; on "offline" we preserve
// queue order so nothing is lost and retries resume where they left off.
export const drainQueue = async (pending, attempt) => {
  const keep = [];
  let synced = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const outcome = await attempt(item);

    if (outcome === "ok") {
      synced++;
      continue;
    }
    if (outcome === "offline") {
      keep.push({ ...item, tries: (item.tries || 0) + 1 });
      keep.push(...pending.slice(i + 1));
      break;
    }
    if (outcome === "drop") {
      continue;
    }
    // "retry" (or anything unexpected) — keep for a later pass.
    keep.push({ ...item, tries: (item.tries || 0) + 1 });
  }

  return { keep, synced };
};

// Map an axios-style error to a drainQueue outcome token. No response == offline.
export const classifyError = (err) => {
  if (!err?.response) return "offline";
  return err.response.status === 404 ? "drop" : "retry";
};

// A routine completed offline is still completed=false on the server until its
// pending op syncs, so hide those from the active (to-do) list the user sees.
export const hideCompletedOffline = (list, pending) => {
  const hidden = new Set((pending || []).map((p) => p.workoutId));
  return (list || []).filter((w) => !hidden.has(w._id));
};

// Merge server history with still-pending offline completions, de-duplicated by
// clientCompletionId so a record that synced between fetches never shows twice.
export const mergeHistory = (serverList, pendingItems) => {
  const seen = new Set((serverList || []).map((w) => w.clientCompletionId).filter(Boolean));
  const extras = (pendingItems || []).filter((p) => !seen.has(p.clientCompletionId));
  return [...extras, ...(serverList || [])];
};
