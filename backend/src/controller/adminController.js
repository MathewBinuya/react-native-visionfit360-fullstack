import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/admin.model.js";
import { sendEmail } from "../lib/email.js";
import { ADMIN_EMAIL, isAllowedAdmin } from "../lib/adminAccess.js";
import { EXERCISE_CATALOG, canonicalExerciseName } from "../lib/exerciseCatalog.js";
import {
  generateTotpSecret, verifyTotp, otpauthUrl, encryptSecret, decryptSecret,
  generateBackupCodes, hashBackupCode,
} from "../lib/totp.js";
import User from "../models/user.model.js";
import Workout from "../models/workout.model.js";
import Exercise from "../models/exercise.model.js";
import Feedback from "../models/feedback.model.js";
import LoginEvent from "../models/loginEvent.model.js";
import {
  ACTIVE_WINDOW_MS,
  RECENTLY_ACTIVE_WINDOW_MS,
  ACCOUNT_ACTIVE_DAYS,
  presenceStatus,
} from "../lib/presence.js";

const generateAdminToken = (id) =>
  jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Explicit allow-list of user fields safe to expose to admins.
// (Never leak password, currentToken, reset/verification codes, etc.)
const SAFE_USER_FIELDS =
  "name username email photo bio gender goal dateOfBirth heightCm weightKg status onBoardingComplete isVerified createdAt updatedAt lastLoginAt lastActiveAt";

const DAY_MS = 24 * 60 * 60 * 1000;

// A "session" is a workout the user actually finished — planned workouts still
// sitting in the tracker are not counted. It's dated by when it was completed.
const TZ = "Asia/Manila";
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const SESSION_MATCH = { completed: true };
const SESSION_DATE = { $ifNull: ["$completedAt", "$date"] };

// Start of the Manila calendar day `daysAgo` days before today.
const manilaDayStart = (now, daysAgo) => {
  const day = Math.floor((now.getTime() + MANILA_OFFSET_MS) / DAY_MS) - daysAgo;
  return new Date(day * DAY_MS - MANILA_OFFSET_MS);
};
const manilaDate = (t) => new Date(t + MANILA_OFFSET_MS).toISOString().slice(0, 10);

// One point per day (oldest -> today), so quiet days show as 0 instead of being skipped.
const fillDays = (rows, start, now) => {
  const counts = new Map(rows.map((r) => [r._id, r.count]));
  const out = [];
  for (let t = start.getTime(); t <= now.getTime(); t += DAY_MS) {
    const date = manilaDate(t);
    out.push({ date, count: counts.get(date) || 0 });
  }
  return out;
};

// Same exercise under different spellings (RepVision saves "bicepcurl", the
// tracker "Bicep Curls") is merged via the catalog; other names group by their
// letters/digits only ("Push-Ups" = "push ups"). Catalog exercises report the AR
// key, which the dashboard already labels.
const exerciseGroup = (name) => {
  const canonical = canonicalExerciseName(name);
  const entry = canonical && EXERCISE_CATALOG.find((e) => e.name === canonical);
  return entry ? entry.key : String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Distinct users + completed sessions per exercise. Shared by the dashboard
// summary and the "Users per Exercise" page.
// Records left behind by deleted accounts are ignored everywhere on the dashboard.
const ownedBy = (userIds) => ({ user: { $in: userIds } });

const loadExerciseUsage = async (limit = 50, userIds) => {
  const rows = await Workout.aggregate([
    { $match: { ...SESSION_MATCH, ...ownedBy(userIds) } },
    { $unwind: "$exercises" },
    { $match: { "exercises.name": { $nin: [null, ""] } } },
    {
      $group: {
        _id: { $toLower: { $trim: { input: "$exercises.name" } } },
        users: { $addToSet: "$user" },
        sessions: { $sum: 1 },
      },
    },
  ]);

  const merged = new Map();
  for (const r of rows) {
    const key = exerciseGroup(r._id);
    if (!key) continue;
    const isCatalog = EXERCISE_CATALOG.some((e) => e.key === key);
    const g = merged.get(key) || { exercise: isCatalog ? key : r._id, users: new Set(), sessions: 0, top: 0 };
    r.users.forEach((u) => g.users.add(String(u)));
    g.sessions += r.sessions;
    if (!isCatalog && r.sessions > g.top) { g.exercise = r._id; g.top = r.sessions; } // most-used spelling
    merged.set(key, g);
  }

  return [...merged.values()]
    .map((g) => ({ exercise: g.exercise, userCount: g.users.size, sessions: g.sessions }))
    .sort((a, b) => b.userCount - a.userCount || b.sessions - a.sessions)
    .slice(0, limit);
};

//  AUTH 
// Two-step login: password, then ONE of — the 6-digit code emailed to
// ADMIN_EMAIL, an authenticator-app code, or a one-time backup code.
// Login responses never use 401 — the dashboard's API client treats 401 as
// "session expired" and reloads to /login, which would interrupt this flow.
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SELECT = "+otpHash +otpExpiresAt +otpAttempts +otpSentAt +otpChallengeId +totpSecretEnc +totpLastStep +backupCodes";
const TOTP_ISSUER = "VisionFIT360 Admin";

const hashOtp = (code) => crypto.createHash("sha256").update(String(code).trim()).digest("hex");

const otpMatches = (code, hash) => {
  if (!hash) return false;
  const a = Buffer.from(hashOtp(code), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Short-lived pass between step 1 and step 2. Its role is NOT "admin", so
// adminProtect rejects it for every dashboard route. `cid` ties it to the one
// pending sign-in stored on the admin, so it can't be reused after it finishes.
const otpChallenge = (id, cid) =>
  jwt.sign({ id, cid, role: "admin-otp" }, process.env.JWT_SECRET, { expiresIn: Math.floor(OTP_TTL_MS / 1000) });

const readChallenge = (token) => {
  try {
    const d = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return d.role === "admin-otp" && d.cid ? { id: d.id, cid: d.cid } : null;
  } catch {
    return null;
  }
};

const loadPendingAdmin = async (challenge) => {
  const c = readChallenge(challenge);
  if (!c) return null;
  const admin = await Admin.findById(c.id).select(OTP_SELECT);
  return isAllowedAdmin(admin) && admin.otpChallengeId && admin.otpChallengeId === c.cid ? admin : null;
};

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
};

const otpEmailHtml = (code) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f7f7f7; border-radius: 12px;">
    <h2 style="color: #111111; margin-bottom: 8px;">Admin sign-in code</h2>
    <p style="color: #555; margin-bottom: 24px;">Someone signed in to the VisionFIT360 admin dashboard with the correct password. Enter this code to finish signing in.</p>
    <div style="background: #ffffff; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: #888; font-size: 13px; margin-bottom: 8px;">YOUR LOGIN CODE</p>
      <p style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #111111; margin: 0;">${code}</p>
    </div>
    <p style="color: #888; font-size: 13px; text-align: center;">This code expires in <strong>10 minutes</strong>.</p>
    <p style="color: #bbb; font-size: 12px; text-align: center; margin-top: 24px;">If this wasn't you, change the admin password right away.</p>
  </div>
`;

// Issues + emails a fresh code (caller saves). Returns false if sending failed.
const sendAdminOtp = async (admin) => {
  const code = crypto.randomInt(100000, 1000000).toString();
  admin.otpHash = hashOtp(code);
  admin.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  admin.otpSentAt = new Date();
  try {
    await sendEmail({ to: ADMIN_EMAIL, subject: "VisionFIT360 — Admin login code", html: otpEmailHtml(code) });
    return true;
  } catch (err) {
    console.log("Admin OTP email failed:", err.message);
    admin.otpHash = undefined;
    admin.otpExpiresAt = undefined;
    admin.otpSentAt = undefined;
    return false;
  }
};

const otpStepResponse = (admin, emailSent) => ({
  otpRequired: true,
  challenge: otpChallenge(admin._id, admin.otpChallengeId),
  email: maskEmail(ADMIN_EMAIL),
  methods: {
    email: !!emailSent,
    app: !!admin.totpEnabled,
    backup: !!admin.totpEnabled && (admin.backupCodes?.length || 0) > 0,
  },
  expiresInSeconds: Math.round(OTP_TTL_MS / 1000),
  resendInSeconds: admin.otpSentAt
    ? Math.max(0, Math.ceil((admin.otpSentAt.getTime() + OTP_RESEND_MS - Date.now()) / 1000))
    : 0,
});

// STEP 1 — email + password. Only ADMIN_EMAIL may sign in.
export const adminLogin = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;
    if (email !== ADMIN_EMAIL) return res.status(400).json({ message: "Invalid credentials" });

    const admin = await Admin.findOne({ email }).select(OTP_SELECT);
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const match = await admin.comparePassword(String(password || ""));
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    admin.otpChallengeId = crypto.randomBytes(16).toString("hex");
    admin.otpAttempts = 0;

    // With an authenticator set up, the admin picks the method on the next
    // screen — no email is sent unless they choose it (POST /login/resend).
    if (admin.totpEnabled) {
      await admin.save();
      return res.json({ ...otpStepResponse(admin, false), choose: true });
    }

    // Email only: a still-valid code sent under a minute ago is reused instead of emailing again.
    const recent = admin.otpHash && admin.otpExpiresAt > new Date() && Date.now() - admin.otpSentAt < OTP_RESEND_MS;
    const emailSent = recent || (await sendAdminOtp(admin));

    // Without an authenticator, email is the only way in.
    if (!emailSent && !admin.totpEnabled) {
      admin.otpChallengeId = undefined;
      await admin.save();
      return res.status(502).json({ message: "Couldn't send the login code. Please try again." });
    }
    await admin.save();
    res.json(otpStepResponse(admin, emailSent));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// STEP 2 — finish with an email code (default), authenticator code, or backup code.
export const verifyAdminOtp = async (req, res) => {
  try {
    const admin = await loadPendingAdmin(req.body.challenge);
    if (!admin) return res.status(400).json({ message: "Your sign-in expired. Please sign in again.", restart: true });

    const method = ["email", "app", "backup"].includes(req.body.method) ? req.body.method : "email";
    const code = String(req.body.code || "").trim();
    let ok = false;

    if (method === "email") {
      if (!admin.otpHash) return res.status(400).json({ message: "No email code is active. Tap Resend code." });
      if (admin.otpExpiresAt < new Date()) {
        return res.status(400).json({ message: "This code has expired. Tap Resend code.", expired: true });
      }
      ok = otpMatches(code, admin.otpHash);
    } else if (method === "app") {
      const secret = admin.totpEnabled && decryptSecret(admin.totpSecretEnc);
      const step = secret ? verifyTotp(secret, code) : null;
      ok = step != null && step > (admin.totpLastStep || 0);
      if (ok) admin.totpLastStep = step;
    } else {
      const h = hashBackupCode(code);
      const idx = admin.totpEnabled ? (admin.backupCodes || []).indexOf(h) : -1;
      ok = idx >= 0;
      if (ok) admin.backupCodes.splice(idx, 1);
    }

    if (!ok) {
      admin.otpAttempts = (admin.otpAttempts || 0) + 1;
      if (admin.otpAttempts >= OTP_MAX_ATTEMPTS) {
        admin.otpHash = undefined;
        admin.otpExpiresAt = undefined;
        admin.otpChallengeId = undefined;
        await admin.save();
        return res.status(400).json({ message: "Too many wrong codes. Please sign in again.", restart: true });
      }
      await admin.save();
      const left = OTP_MAX_ATTEMPTS - admin.otpAttempts;
      return res.status(400).json({ message: `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` });
    }

    admin.otpHash = undefined;
    admin.otpExpiresAt = undefined;
    admin.otpChallengeId = undefined;
    admin.otpAttempts = 0;
    await admin.save();

    res.json({
      token: generateAdminToken(admin._id),
      admin: { id: admin._id, username: admin.username, email: admin.email, name: admin.name },
      backupCodesLeft: admin.totpEnabled ? admin.backupCodes.length : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Sends the email code — when the admin chooses email (`first: true`) or taps
// Resend (once per minute) — without re-entering the password.
export const resendAdminOtp = async (req, res) => {
  try {
    const admin = await loadPendingAdmin(req.body.challenge);
    if (!admin) return res.status(400).json({ message: "Your sign-in expired. Please sign in again.", restart: true });

    const wait = admin.otpSentAt ? admin.otpSentAt.getTime() + OTP_RESEND_MS - Date.now() : 0;
    // Choosing email again within a minute reuses the code that's already on its way.
    if (req.body.first && wait > 0 && admin.otpHash && admin.otpExpiresAt > new Date()) {
      return res.json(otpStepResponse(admin, true));
    }
    if (wait > 0) {
      return res.status(429).json({ message: `Please wait ${Math.ceil(wait / 1000)}s before resending.`, resendInSeconds: Math.ceil(wait / 1000) });
    }
    const sent = await sendAdminOtp(admin);
    await admin.save();
    if (!sent) {
      return res.status(502).json({
        message: admin.totpEnabled
          ? "Couldn't send the email code. Use your authenticator app instead."
          : "Couldn't send the login code. Please try again.",
      });
    }
    res.json(otpStepResponse(admin, true));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//  SECURITY — authenticator app (only reachable when already signed in)
const TOTP_SELECT = "+password +totpSecretEnc +totpPendingEnc +totpLastStep +backupCodes";

const newBackupCodes = (admin) => {
  const codes = generateBackupCodes(8);
  admin.backupCodes = codes.map(hashBackupCode);
  return codes;
};

export const getTwoFactorStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select(TOTP_SELECT);
    res.json({ enabled: !!admin.totpEnabled, backupCodesLeft: admin.totpEnabled ? admin.backupCodes?.length || 0 : 0, account: ADMIN_EMAIL });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Starts setup: a new secret is kept as "pending" until a first code confirms it.
export const startTwoFactorSetup = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select(TOTP_SELECT);
    if (admin.totpEnabled) return res.status(400).json({ message: "The authenticator is already set up. Turn it off first to set up a new one." });
    const secret = generateTotpSecret();
    admin.totpPendingEnc = encryptSecret(secret);
    await admin.save();
    res.json({ secret, otpauthUrl: otpauthUrl({ secret, account: ADMIN_EMAIL, issuer: TOTP_ISSUER }) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const confirmTwoFactorSetup = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select(TOTP_SELECT);
    const secret = admin.totpPendingEnc && decryptSecret(admin.totpPendingEnc);
    if (!secret) return res.status(400).json({ message: "Start the setup again." });
    const step = verifyTotp(secret, req.body.code);
    if (step == null) return res.status(400).json({ message: "That code didn't match. Check your phone's time is automatic and try the newest code." });

    admin.totpSecretEnc = admin.totpPendingEnc;
    admin.totpPendingEnc = undefined;
    admin.totpEnabled = true;
    admin.totpLastStep = step;
    const backupCodes = newBackupCodes(admin);
    await admin.save();
    res.json({ enabled: true, backupCodes });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const regenerateBackupCodes = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select(TOTP_SELECT);
    if (!admin.totpEnabled) return res.status(400).json({ message: "Set up the authenticator first." });
    const step = verifyTotp(decryptSecret(admin.totpSecretEnc), req.body.code);
    if (step == null || step <= (admin.totpLastStep || 0)) return res.status(400).json({ message: "Enter a current code from your authenticator app." });
    admin.totpLastStep = step;
    const backupCodes = newBackupCodes(admin);
    await admin.save();
    res.json({ backupCodes });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Turning it off needs the password AND an authenticator or backup code.
export const disableTwoFactor = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select(TOTP_SELECT);
    if (!admin.totpEnabled) return res.json({ enabled: false });
    if (!(await admin.comparePassword(String(req.body.password || "")))) {
      return res.status(400).json({ message: "Incorrect password." });
    }
    const code = String(req.body.code || "").trim();
    const step = verifyTotp(decryptSecret(admin.totpSecretEnc), code);
    const backupOk = (admin.backupCodes || []).includes(hashBackupCode(code));
    if (!(step != null && step > (admin.totpLastStep || 0)) && !backupOk) {
      return res.status(400).json({ message: "Enter a current authenticator code or a backup code." });
    }
    admin.totpEnabled = false;
    admin.totpSecretEnc = undefined;
    admin.totpPendingEnc = undefined;
    admin.totpLastStep = undefined;
    admin.backupCodes = [];
    await admin.save();
    res.json({ enabled: false });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


//  ANALYTICS
export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWorkouts = await Workout.countDocuments();
    const completedWorkouts = await Workout.countDocuments({ completed: true });

    // active users = users with a workout in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUserIds = await Workout.distinct("user", { createdAt: { $gte: weekAgo } });

    res.json({
      totalUsers,
      totalWorkouts,
      completedWorkouts,
      activeUsers: activeUserIds.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//  USER MANAGEMENT
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select(SAFE_USER_FIELDS).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(SAFE_USER_FIELDS);
    if (!user) return res.status(404).json({ message: "User not found" });
    const [workouts, feedback] = await Promise.all([
      Workout.find({ user: user._id }).sort({ createdAt: -1 }),
      Feedback.find({ user: user._id }).sort({ createdAt: -1 }),
    ]);
    res.json({ user, workouts, feedback });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // remove everything tied to the account so it doesn't linger in the dashboard
    await Promise.all([
      Workout.deleteMany({ user: req.params.id }),
      Feedback.deleteMany({ user: req.params.id }),
      LoginEvent.deleteMany({ user: req.params.id }),
    ]);
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//  EXERCISE / CONTENT MANAGEMENT 
export const getExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find().sort({ createdAt: 1 });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createExercise = async (req, res) => {
  try {
    const exercise = await Exercise.create(req.body);
    res.status(201).json(exercise);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exercise) return res.status(404).json({ message: "Exercise not found" });
    res.json(exercise);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExercise = async (req, res) => {
  try {
    await Exercise.findByIdAndDelete(req.params.id);
    res.json({ message: "Exercise deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//  DASHBOARD (aggregated, admin-only)
//  Heavy aggregations for the full dashboard. Trends respect ?range=7|30 (days).
export const getDashboard = async (req, res) => {
  try {
    const range = [7, 30].includes(Number(req.query.range)) ? Number(req.query.range) : 7;
    const now = new Date();
    // "Last N days" = today plus the previous N-1 calendar days in Manila, so the
    // KPI numbers and the daily charts cover exactly the same days.
    const rangeStart = manilaDayStart(now, range - 1);
    const liveUsers = await User.distinct("_id");
    const owned = ownedBy(liveUsers);
    const sessionsSince = (start) => ({
      ...SESSION_MATCH,
      ...owned,
      $or: [{ completedAt: { $gte: start } }, { completedAt: null, date: { $gte: start } }],
    });
    const recentlyActiveThreshold = new Date(now.getTime() - RECENTLY_ACTIVE_WINDOW_MS);
    const accountActiveThreshold = new Date(now.getTime() - ACCOUNT_ACTIVE_DAYS * DAY_MS);

    const [
      totalUsers,
      newUsers,
      activeUsers,
      activeAccounts,
      totalSessions,
      sessionsInRange,
      demographics,
      exerciseUsage,
      repQualityAgg,
      workoutTrend,
      newUserTrend,
      feedbackFacet,
      recentFeedback,
      recentLogins,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: rangeStart } }),
      User.countDocuments({ lastActiveAt: { $gte: recentlyActiveThreshold } }),
      // Account Active = used OR logged into the app within ACCOUNT_ACTIVE_DAYS.
      // Keyed off lastActiveAt (heartbeat) so persistent sessions still count as
      // active; falls back to lastLoginAt for any legacy row missing lastActiveAt.
      User.countDocuments({
        $or: [
          { lastActiveAt: { $gte: accountActiveThreshold } },
          { lastLoginAt: { $gte: accountActiveThreshold } },
        ],
      }),
      Workout.countDocuments({ ...SESSION_MATCH, ...owned }),
      Workout.countDocuments(sessionsSince(rangeStart)),

      // --- demographics: one pass over users, several facets ---
      User.aggregate([
        {
          $facet: {
            gender: [
              { $group: { _id: { $ifNull: ["$gender", "Not specified"] }, count: { $sum: 1 } } },
            ],
            // (Age demographics intentionally omitted — Age is not shown in the admin.)
            bmiCategories: [
              {
                $addFields: {
                  bmi: {
                    $cond: [
                      { $and: [{ $gt: ["$heightCm", 0] }, { $gt: ["$weightKg", 0] }] },
                      { $divide: ["$weightKg", { $pow: [{ $divide: ["$heightCm", 100] }, 2] }] },
                      null,
                    ],
                  },
                },
              },
              {
                $addFields: {
                  bmiCategory: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$bmi", null] }, then: "Not specified" },
                        { case: { $lt: ["$bmi", 18.5] }, then: "Underweight" },
                        { case: { $lt: ["$bmi", 25] }, then: "Normal" },
                        { case: { $lt: ["$bmi", 30] }, then: "Overweight" },
                      ],
                      default: "Obese",
                    },
                  },
                },
              },
              { $group: { _id: "$bmiCategory", count: { $sum: 1 } } },
            ],
            body: [
              {
                $group: {
                  _id: null,
                  avgHeight: { $avg: "$heightCm" },
                  minHeight: { $min: "$heightCm" },
                  maxHeight: { $max: "$heightCm" },
                  avgWeight: { $avg: "$weightKg" },
                  minWeight: { $min: "$weightKg" },
                  maxWeight: { $max: "$weightKg" },
                  withHeight: { $sum: { $cond: [{ $gt: ["$heightCm", 0] }, 1, 0] } },
                  withWeight: { $sum: { $cond: [{ $gt: ["$weightKg", 0] }, 1, 0] } },
                },
              },
            ],
          },
        },
      ]),

      // --- users per exercise + sessions per exercise ---
      loadExerciseUsage(50, liveUsers),

      // --- good vs bad rep totals (only AR sets carry these) ---
      Workout.aggregate([
        { $match: { ...SESSION_MATCH, ...owned } },
        { $unwind: "$exercises" },
        { $unwind: "$exercises.sets" },
        {
          $group: {
            _id: null,
            good: { $sum: { $ifNull: ["$exercises.sets.goodReps", 0] } },
            bad: { $sum: { $ifNull: ["$exercises.sets.badReps", 0] } },
          },
        },
      ]),

      // --- completed sessions per Manila day, within range ---
      Workout.aggregate([
        { $match: { ...SESSION_MATCH, ...owned } },
        { $addFields: { at: SESSION_DATE } },
        { $match: { at: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$at", timezone: TZ } },
            count: { $sum: 1 },
          },
        },
      ]),

      // --- sign-ups per Manila day, within range ---
      User.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            count: { $sum: 1 },
          },
        },
      ]),

      // --- feedback summary + rating distribution ---
      Feedback.aggregate([
        { $match: owned },
        {
          $facet: {
            summary: [{ $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }],
            distribution: [
              { $group: { _id: "$rating", count: { $sum: 1 } } },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),

      Feedback.find(owned).sort({ createdAt: -1 }).limit(20).populate("user", "name username photo"),
      LoginEvent.find(owned).sort({ createdAt: -1 }).limit(20).populate("user", "name username photo"),
      User.find().sort({ createdAt: -1 }).limit(10).select("name username email gender createdAt"),
    ]);

    const demo = demographics[0] || {};
    const repQuality = repQualityAgg[0] || { good: 0, bad: 0 };
    const fb = feedbackFacet[0] || { summary: [], distribution: [] };
    const fbSummary = fb.summary[0] || { avg: 0, count: 0 };

    res.json({
      range,
      generatedAt: now,
      kpis: {
        totalUsers,
        newUsers,
        activeUsers, // live presence: seen within the "recently active" window
        activeAccounts, // account status: logged in within ACCOUNT_ACTIVE_DAYS
        inactiveAccounts: Math.max(0, totalUsers - activeAccounts),
        accountActiveDays: ACCOUNT_ACTIVE_DAYS,
        totalSessions,
        sessionsInRange,
        avgRating: fbSummary.avg ? +fbSummary.avg.toFixed(2) : 0,
        feedbackCount: fbSummary.count,
      },
      demographics: {
        gender: demo.gender || [],
        bmiCategories: demo.bmiCategories || [],
        body: (demo.body && demo.body[0]) || null,
      },
      workouts: {
        exerciseUsage, // [{ exercise, userCount, sessions }]
        repQuality,    // { good, bad }  (ratio only meaningful when good+bad > 0)
        usageTrend: fillDays(workoutTrend, rangeStart, now),
      },
      analytics: {
        newUsersTrend: fillDays(newUserTrend, rangeStart, now),
      },
      feedback: {
        avgRating: fbSummary.avg ? +fbSummary.avg.toFixed(2) : 0,
        count: fbSummary.count,
        distribution: fb.distribution.map((d) => ({ rating: d._id, count: d.count })),
        recent: recentFeedback,
      },
      logins: { recent: recentLogins },
      recentUsers,
    });
  } catch (error) {
    console.log("getDashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  PRESENCE (lightweight, polled frequently by the dashboard)
export const getPresence = async (req, res) => {
  try {
    const now = Date.now();
    const activeThreshold = new Date(now - ACTIVE_WINDOW_MS);
    const recentThreshold = new Date(now - RECENTLY_ACTIVE_WINDOW_MS);
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const [countsAgg, users] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $gte: ["$lastActiveAt", activeThreshold] }, 1, 0] } },
            recentlyActive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$lastActiveAt", activeThreshold] },
                      { $gte: ["$lastActiveAt", recentThreshold] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      User.find({ lastActiveAt: { $gte: recentThreshold } })
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .select("name username photo lastActiveAt"),
    ]);

    const c = countsAgg[0] || { total: 0, active: 0, recentlyActive: 0 };
    const inactive = c.total - c.active - c.recentlyActive;
    const list = users.map((u) => ({
      _id: u._id,
      name: u.name,
      username: u.username,
      photo: u.photo,
      lastActiveAt: u.lastActiveAt,
      status: presenceStatus(u.lastActiveAt, now),
    }));

    res.json({
      counts: { total: c.total, active: c.active, recentlyActive: c.recentlyActive, inactive },
      users: list,
      windows: { activeMs: ACTIVE_WINDOW_MS, recentlyActiveMs: RECENTLY_ACTIVE_WINDOW_MS },
    });
  } catch (error) {
    console.log("getPresence error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  USERS PER EXERCISE
//  Card data: every exercise people have actually done, with distinct-user + session counts.
export const getExerciseUsage = async (req, res) => {
  try {
    const usage = await loadExerciseUsage(100, await User.distinct("_id"));
    res.json(usage);
  } catch (error) {
    console.log("getExerciseUsage error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  Drill-down: paginated list of users who have done a given exercise (optional search).
export const getUsersByExercise = async (req, res) => {
  try {
    const exercise = String(req.params.exercise || "").toLowerCase();
    // every stored spelling that belongs to this exercise (e.g. "bicepcurl" + "bicep curls")
    const group = exerciseGroup(exercise);
    const spellings = (await Workout.distinct("exercises.name", SESSION_MATCH))
      .map((n) => String(n).trim().toLowerCase())
      .filter((n) => n && exerciseGroup(n) === group);
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");

    const result = await Workout.aggregate([
      { $match: SESSION_MATCH },
      { $unwind: "$exercises" },
      { $addFields: { exLower: { $toLower: { $trim: { input: "$exercises.name" } } } } },
      { $match: { exLower: { $in: spellings } } },
      { $group: { _id: "$user", sessions: { $sum: 1 }, lastUsed: { $max: SESSION_DATE } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      ...(search
        ? [{ $match: { $or: [{ "user.name": re }, { "user.username": re }, { "user.email": re }] } }]
        : []),
      {
        $project: {
          _id: 0,
          userId: "$_id",
          sessions: 1,
          lastUsed: 1,
          name: "$user.name",
          username: "$user.username",
          email: "$user.email",
          photo: "$user.photo",
        },
      },
      { $sort: { sessions: -1, lastUsed: -1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const total = result[0]?.total?.[0]?.count || 0;
    res.json({ exercise, users: data, total, page, limit });
  } catch (error) {
    console.log("getUsersByExercise error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;   // "active" or "inactive"
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select(SAFE_USER_FIELDS);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};