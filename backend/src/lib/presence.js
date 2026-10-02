// Tunable presence / activity windows — single source of truth for the whole app.
// "Active" here means "seen recently", NOT a guaranteed live connection.

export const ACTIVE_WINDOW_MS = 2 * 60 * 1000;          // seen within 2 min  -> Active
export const RECENTLY_ACTIVE_WINDOW_MS = 15 * 60 * 1000; // seen within 15 min -> Recently active
// anything older than RECENTLY_ACTIVE_WINDOW_MS, or never seen -> Inactive

// How long we keep raw login events before the TTL index removes them.
export const LOGIN_EVENT_TTL_DAYS = 90;

// Account-level status (distinct from live presence above): logged in within this
// many days = Active, else Inactive. Mirrors the admin Users page rule. Tunable.
export const ACCOUNT_ACTIVE_DAYS = 7;

// Derive a status string from a lastActiveAt value (Date | null | undefined).
export const presenceStatus = (lastActiveAt, now = Date.now()) => {
  if (!lastActiveAt) return "inactive";
  const age = now - new Date(lastActiveAt).getTime();
  if (age <= ACTIVE_WINDOW_MS) return "active";
  if (age <= RECENTLY_ACTIVE_WINDOW_MS) return "recently_active";
  return "inactive";
};
