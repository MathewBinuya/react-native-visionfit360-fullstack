const GMAIL = ["gmail.com", "googlemail.com"];
const MICROSOFT = ["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.ph"];
const YAHOO = ["yahoo.com", "ymail.com", "rocketmail.com"];

const ALLOWED = new Set([...GMAIL, ...MICROSOFT, ...YAHOO]);
const YAHOO_REGIONAL = /^yahoo\.[a-z]{2,3}(\.[a-z]{2})?$/;

function getDomain(email) {
  return String(email).trim().toLowerCase().split("@")[1] || "";
}

export function isAllowedEmail(email) {
  const domain = getDomain(email);
  return ALLOWED.has(domain) || YAHOO_REGIONAL.test(domain);
}

export function normalizeEmail(email) {
  const clean = String(email).trim().toLowerCase();
  const [local, domain] = clean.split("@");
  if (!local || !domain) return clean;

  if (GMAIL.includes(domain)) {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  if (MICROSOFT.includes(domain)) {
    return `${local.split("+")[0]}@${domain}`;
  }
  return clean;
}