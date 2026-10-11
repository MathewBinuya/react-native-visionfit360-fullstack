import crypto from "crypto";

// Authenticator-app codes (TOTP, RFC 6238): 6 digits, 30-second steps, SHA-1 —
// the defaults Google/Microsoft Authenticator and Authy expect.
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept the previous/next step too (phone clock drift)
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buf) => {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
};

const base32Decode = (str) => {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

const hotp = (secretB32, counter) => {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const offset = h[h.length - 1] & 15;
  const bin = ((h[offset] & 127) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
};

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

// Returns the matching time step, or null. Callers reject steps already used.
export const verifyTotp = (secretB32, code, now = Date.now()) => {
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const step = currentStep(now);
  for (let w = -WINDOW; w <= WINDOW; w++) {
    const candidate = hotp(secretB32, step + w);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(c))) return step + w;
  }
  return null;
};

export const otpauthUrl = ({ secret, account, issuer }) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}` +
  `&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;

// ---- encryption at rest (AES-256-GCM) ----
// Uses TOTP_ENCRYPTION_KEY when set; otherwise a key derived from JWT_SECRET.
// Changing whichever key is used makes the stored secret unreadable, so the
// authenticator would need to be set up again.
const encKey = () =>
  crypto.createHash("sha256").update(process.env.TOTP_ENCRYPTION_KEY || `totp:${process.env.JWT_SECRET}`).digest();

export const encryptSecret = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
};

export const decryptSecret = (stored) => {
  try {
    const [iv, tag, data] = String(stored).split(".").map((s) => Buffer.from(s, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};

// ---- backup codes ----
export const hashBackupCode = (code) =>
  crypto.createHash("sha256").update(String(code).toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");

export const generateBackupCodes = (n = 8) =>
  Array.from({ length: n }, () => {
    const hex = crypto.randomBytes(4).toString("hex");
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  });
