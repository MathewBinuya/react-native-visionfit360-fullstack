// Tunable presence / activity windows — single source of truth for the whole app.
// "Active" here means "seen recently", NOT a guaranteed live connection.

export const ACTIVE_WINDOW_MS = 2 * 60 * 1000;          // seen within 2 min  -> Active
export const RECENTLY_ACTIVE_WINDOW_MS = 15 * 60 * 1000; // seen within 15 min -> Recently active
// anything older than RECENTLY_ACTIVE_WINDOW_MS, or never seen -> Inactive

// How long we keep raw login events before the TTL index removes them.
export const LOGIN_EVENT_TTL_DAYS = 90;

// Account-level status (distinct from live presence above): used the app within
// this many days = Active, else Inactive. Mirrors the admin Users page rule. Tunable.
export const ACCOUNT_ACTIVE_DAYS = 7;
export const ACCOUNT_ACTIVE_WINDOW_MS = ACCOUNT_ACTIVE_DAYS * 24 * 60 * 60 * 1000;

// Derive a status string from a lastActiveAt value (Date | null | undefined).
export const presenceStatus = (lastActiveAt, now = Date.now()) => {
  if (!lastActiveAt) return "inactive";
  const age = now - new Date(lastActiveAt).getTime();
  if (age <= ACTIVE_WINDOW_MS) return "active";
  if (age <= RECENTLY_ACTIVE_WINDOW_MS) return "recently_active";
  return "inactive";
};

// The effective "last used the app" instant for a user. The mobile app persists
// its JWT and auto-restores the session, so an engaged user may not *log in* again
// for weeks while still using the app daily (heartbeat keeps lastActiveAt fresh).
// So account status must key off activity, not just login: take the later of the
// two. lastActiveAt alone normally wins (login stamps both), but the max is robust
// to legacy rows where only one is set.
export const lastSeenAt = (user) => {
  const a = user?.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  const l = user?.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0;
  const t = Math.max(a, l);
  return t ? new Date(t) : null;
};

// Account Active/Inactive: used (or logged into) the app within ACCOUNT_ACTIVE_DAYS.
// Automatic — no manually assigned status, no hardcoded values.
export const isAccountActive = (user, now = Date.now()) => {
  const seen = lastSeenAt(user);
  return !!seen && now - seen.getTime() <= ACCOUNT_ACTIVE_WINDOW_MS;
};
