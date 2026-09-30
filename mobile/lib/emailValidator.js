const ALLOWED = new Set([
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.ph",
  "yahoo.com", "ymail.com", "rocketmail.com",
]);

const YAHOO_REGIONAL = /^yahoo\.[a-z]{2,3}(\.[a-z]{2})?$/;

export function isAllowedEmail(email) {
  const domain = String(email).trim().toLowerCase().split("@")[1] || "";
  return ALLOWED.has(domain) || YAHOO_REGIONAL.test(domain);
}

export const EMAIL_DOMAIN_ERROR = "Please use a Gmail, Outlook, or Yahoo email address";