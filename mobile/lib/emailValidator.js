const ALLOWED = new Set(["gmail.com", "outlook.com", "yahoo.com"]);

export function isAllowedEmail(email) {
  const domain = String(email).trim().toLowerCase().split("@")[1] || "";
  return ALLOWED.has(domain);
}

export const EMAIL_DOMAIN_ERROR = "Please use a Gmail, Outlook, or Yahoo email address";