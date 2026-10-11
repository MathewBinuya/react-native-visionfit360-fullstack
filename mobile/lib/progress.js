// Formatting helpers for the progress analytics returned by GET /workouts/analytics.
// Weeks are Monday–Sunday in Asia/Manila; weekStart/weekEnd arrive as "YYYY-MM-DD".

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export const shortDate = (isoDay) => {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export const weekRange = (w) => `${shortDate(w.weekStart)} – ${shortDate(w.weekEnd)}`;

// A timestamp shown as its calendar day in Manila.
export const manilaDate = (value) => {
  const d = new Date(new Date(value).getTime() + MANILA_OFFSET_MS);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export const compactKg = (kg) => {
  const n = Math.round(kg || 0);
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
};

export const formatPct = (pct) => (pct == null ? null : `${pct > 0 ? "+" : ""}${pct}%`);

export const formatDiff = (n, unit) => `${n > 0 ? "+" : ""}${n} ${unit}${Math.abs(n) === 1 ? "" : "s"}`;

// "Guide already seen" is remembered per account, so a new account on the same phone still gets it.
export const guideSeenKey = (guide, user) => `${guide}GuideSeen:${user?.id || user?._id || "unknown"}`;
