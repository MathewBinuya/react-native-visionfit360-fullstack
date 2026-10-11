// Centralized email sender for VisionFIT360 — Brevo transactional email API.
// Uses HTTPS (port 443) because Render's free plan blocks outbound SMTP ports
// (25/465/587). Every email in the app goes through sendEmail() so there is one
// place to change.
//
// Env:
//   BREVO_API_KEY    — Brevo → SMTP & API → API keys (v3 key, starts with "xkeysib-")
//   EMAIL_FROM       — a sender address verified in Brevo → Senders
//   EMAIL_FROM_NAME  — optional display name (default "VisionFIT360")

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.GMAIL_USER;
const FROM_NAME = process.env.EMAIL_FROM_NAME || "VisionFIT360";

if (!API_KEY || !FROM_EMAIL) {
  console.log("EMAIL NOT CONFIGURED: set BREVO_API_KEY and EMAIL_FROM");
} else {
  console.log(`Email ready (Brevo, from ${FROM_EMAIL})`);
}

/**
 * Send an email via Brevo. Throws on failure so callers can return an error.
 * @param {{ to: string, subject: string, html: string }} message
 */
export async function sendEmail({ to, subject, html }) {
  if (!API_KEY || !FROM_EMAIL) throw new Error("Email is not configured (BREVO_API_KEY / EMAIL_FROM)");

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.log("Brevo send failed:", res.status, detail);
    throw new Error(`Email send failed (${res.status})`);
  }

  const { messageId } = await res.json().catch(() => ({}));
  return { provider: "brevo", messageId };
}

export default sendEmail;
