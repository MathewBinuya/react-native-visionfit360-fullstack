// Age helpers. The app ALWAYS stores date of birth (dateOfBirth) — never a raw
// age number — so "age" is derived on the fly and updates on the user's birthday
// automatically, with no cron job or birthday bookkeeping. Keep the age tiers in
// sync with the backend AGE_TIERS in backend/src/controller/aiController.js.

// sanity bounds for a date-of-birth picker (not medical limits)
export const MIN_AGE = 5;
export const MAX_AGE = 100;

// whole-year age from a date of birth; null if missing/invalid/out of range
export const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  // not had this year's birthday yet? subtract one
  const hadBirthday =
    now.getMonth() > d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBirthday) age--;
  return age >= 0 && age < 130 ? age : null;
};

// The newest DOB allowed = you must be at least MIN_AGE years old today.
export const maxBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d;
};

// The oldest DOB allowed = no older than MAX_AGE.
export const minBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MAX_AGE);
  return d;
};

// human-friendly display, e.g. "Jan 5, 2010"
export const formatDob = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d)) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

// a plausible real birthday within the allowed age window
export const isValidDob = (dob) => {
  const age = ageFromDob(dob);
  return age != null && age >= MIN_AGE && age <= MAX_AGE;
};
