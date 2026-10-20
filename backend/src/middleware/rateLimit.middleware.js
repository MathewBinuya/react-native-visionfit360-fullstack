import rateLimit from "express-rate-limit";

// Per-IP throttles for the auth endpoints. Limits are generous enough for real
// users (who retry a handful of times) but stop password brute-forcing and
// email/code spamming. A tripped limiter returns 429 with { message }, which the
// app already surfaces via its normal error handling.
//
// NOTE: behind Render's proxy, `app.set("trust proxy", 1)` must be set (see
// server.js) so these key off the real client IP, not the shared proxy IP.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const make = (limit, message) =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

// Password attempts — the main brute-force surface.
export const loginLimiter = make(10, "Too many login attempts. Please try again in a few minutes.");

// Endpoints that send an email (register / forgot password / resend) — kept tight
// to prevent inbox spamming. The controllers also enforce a 60s resend cooldown.
export const emailLimiter = make(6, "Too many requests. Please wait a few minutes and try again.");

// Code-entry endpoints (verify email / reset password). The controllers already
// lock a code after 5 wrong guesses; this bounds hammering across codes too.
export const codeLimiter = make(20, "Too many attempts. Please wait a few minutes and try again.");
