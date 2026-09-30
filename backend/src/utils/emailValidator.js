const ALLOWED = new Set(["gmail.com", "outlook.com", "yahoo.com"]);

function getDomain(email) {
  return String(email).trim().toLowerCase().split("@")[1] || "";
}

export function isAllowedEmail(email) {
  return ALLOWED.has(getDomain(email));
}

// Gmail: ignores dots and +tags. Outlook: ignores +tags. Yahoo: trim + lowercase only.
export function normalizeEmail(email) {
  const clean = String(email).trim().toLowerCase();
  const [local, domain] = clean.split("@");
  if (!local || !domain) return clean;

  if (domain === "gmail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  if (domain === "outlook.com") {
    return `${local.split("+")[0]}@outlook.com`;
  }
  return clean;
}