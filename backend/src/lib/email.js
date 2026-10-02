import nodemailer from "nodemailer";

// Centralized email sender for VisionFIT360 — Nodemailer / Gmail SMTP.
// Every email in the app goes through sendEmail() so there is one place to change.

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.GMAIL_USER;
const FROM_NAME = process.env.EMAIL_FROM_NAME || "VisionFIT360";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
});
transporter.verify().then(() => console.log("SMTP ready")).catch((e) => console.log("SMTP FAILED:", e.code, e.message));

/**
 * Send an email via Gmail SMTP.
 * @param {{ to: string, subject: string, html: string }} message
 */
export async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
  return { provider: "nodemailer" };
}

export default sendEmail;
