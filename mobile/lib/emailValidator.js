// Keep this list in sync with backend/utils/emailValidator.js
const ALLOWED = new Set(["gmail.com", "outlook.com", "yahoo.com"]);

export function isAllowedEmail(email) {
  const parts = String(email).trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0]) return false;
  return ALLOWED.has(parts[1]);
}

export const EMAIL_DOMAIN_ERROR =
  "Please use a Gmail, Outlook, or Yahoo email address";