// Unit conversion helpers.
// The app ALWAYS stores normalized metric values (heightCm, weightKg).
// These helpers convert to/from display units only — we never persist the
// converted display value, so toggling units can't cause rounding drift.

export const IN_TO_CM = 2.54;
export const LB_TO_KG = 0.45359237;

// sensible ranges (metric) — shared by onboarding + profile validation
export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 250;
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

export const HEIGHT_UNITS = ["cm", "ft"];
export const WEIGHT_UNITS = ["kg", "lb"];

// --- height ---

// cm -> { ft, in } (inches rounded, with 12" rollover handled)
export const cmToFtIn = (cm) => {
  const n = Number(cm);
  if (!n || isNaN(n)) return { ft: "", in: "" };
  const totalInches = n / IN_TO_CM;
  let ft = Math.floor(totalInches / 12);
  let inch = Math.round(totalInches - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return { ft: String(ft), in: String(inch) };
};

// { ft, in } -> cm (rounded to the nearest cm). Empty feet AND inches -> "".
export const ftInToCm = (ft, inch) => {
  const f = ft === "" || ft == null ? NaN : Number(ft);
  const i = inch === "" || inch == null ? 0 : Number(inch); // feet without inches is allowed
  if (isNaN(f) && (inch === "" || inch == null)) return "";
  const feet = isNaN(f) ? 0 : f;
  const inches = isNaN(i) ? 0 : i;
  const cm = (feet * 12 + inches) * IN_TO_CM;
  return String(Math.round(cm));
};

// --- weight ---

// kg -> lb (one decimal). Empty -> "".
export const kgToLb = (kg) => {
  const n = Number(kg);
  if (!n || isNaN(n)) return "";
  return String(Math.round((n / LB_TO_KG) * 10) / 10);
};

// lb -> kg (one decimal). Empty -> "".
export const lbToKg = (lb) => {
  if (lb === "" || lb == null) return "";
  const n = Number(lb);
  if (isNaN(n)) return "";
  return String(Math.round(n * LB_TO_KG * 10) / 10);
};

// digits-only (optionally one decimal point) cleaner for text inputs
export const cleanNumber = (text, allowDecimal = false) => {
  const pattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g;
  let cleaned = String(text).replace(pattern, "");
  if (allowDecimal) {
    const [whole, ...rest] = cleaned.split(".");
    cleaned = rest.length ? `${whole}.${rest.join("")}` : whole;
  }
  return cleaned;
};

// per-user AsyncStorage key for the preferred display units
export const unitPrefKey = (userId) => `unitPrefs:${userId || "unknown"}`;
