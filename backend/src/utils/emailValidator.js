const ALLOWED = new Set(["gmail.com", "outlook.com", "yahoo.com"]);

export function isAllowedEmail(email) {
  const parts = String(email).trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0]) return false;
  return ALLOWED.has(parts[1]);
}

export function normalizeEmail(email) {
  const clean = String(email).trim().toLowerCase();
  let [local, domain] = clean.split("@");
  if (!local || !domain) return clean;

  if (domain === "gmail.com") {
    // Gmail ignores dots and everything after "+"
    local = local.split("+")[0].replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

export const EMAIL_DOMAIN_ERROR =
  "Please use a Gmail, Outlook, or Yahoo email address";