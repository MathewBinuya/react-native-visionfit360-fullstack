import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/admin.model.js";
import { sendEmail } from "../lib/email.js";
import { ADMIN_EMAIL, isAllowedAdmin } from "../lib/adminAccess.js";
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

// Shared pipeline: distinct users + session counts per exercise (from workout records).
// Reused by the dashboard summary and the dedicated "Users per Exercise" page.
const exerciseUsagePipeline = (limit = 50) => [
  { $unwind: "$exercises" },
  { $match: { "exercises.name": { $nin: [null, ""] } } },
  {
    $group: {
      _id: { $toLower: "$exercises.name" },
      users: { $addToSet: "$user" },
      sessions: { $sum: 1 },
    },
  },
  { $project: { _id: 0, exercise: "$_id", userCount: { $size: "$users" }, sessions: 1 } },
  { $sort: { userCount: -1, sessions: -1 } },
  { $limit: limit },
];

//  AUTH 
// Two-step login: password, then a 6-digit code emailed to ADMIN_EMAIL.
// Login responses never use 401 — the dashboard's API client treats 401 as
// "session expired" and reloads to /login, which would interrupt this flow.
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SELECT = "+otpHash +otpExpiresAt +otpAttempts +otpSentAt";

const hashOtp = (code) => crypto.createHash("sha256").update(String(code).trim()).digest("hex");

const otpMatches = (code, hash) => {
  if (!hash) return false;
  const a = Buffer.from(hashOtp(code), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Short-lived pass between step 1 and step 2. Its role is NOT "admin", so
// adminProtect rejects it for every dashboard route.
const otpChallenge = (id) =>
  jwt.sign({ id, role: "admin-otp" }, process.env.JWT_SECRET, { expiresIn: Math.floor(OTP_TTL_MS / 1000) });

const readChallenge = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return decoded.role === "admin-otp" ? decoded.id : null;
  } catch {
    return null;
  }
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

// Issues + emails a fresh code. Returns false if the email could not be sent.
const sendAdminOtp = async (admin) => {
  const code = crypto.randomInt(100000, 1000000).toString();
  admin.otpHash = hashOtp(code);
  admin.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  admin.otpAttempts = 0;
  admin.otpSentAt = new Date();
  await admin.save();
  try {
    await sendEmail({ to: ADMIN_EMAIL, subject: "VisionFIT360 — Admin login code", html: otpEmailHtml(code) });
    return true;
  } catch (err) {
    console.log("Admin OTP email failed:", err.message);
    admin.otpHash = undefined;
    admin.otpExpiresAt = undefined;
    admin.otpSentAt = undefined;
    await admin.save();
    return false;
  }
};

const otpStepResponse = (admin) => ({
  otpRequired: true,
  challenge: otpChallenge(admin._id),
  email: maskEmail(ADMIN_EMAIL),
  expiresInSeconds: Math.max(0, Math.round((admin.otpExpiresAt - Date.now()) / 1000)),
  resendInSeconds: Math.max(0, Math.ceil((admin.otpSentAt.getTime() + OTP_RESEND_MS - Date.now()) / 1000)),
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

    // A still-valid code sent under a minute ago is reused instead of emailing again.
    const recent = admin.otpHash && admin.otpExpiresAt > new Date() && Date.now() - admin.otpSentAt < OTP_RESEND_MS;
    if (!recent && !(await sendAdminOtp(admin))) {
      return res.status(502).json({ message: "Couldn't send the login code. Please try again." });
    }
    res.json(otpStepResponse(admin));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// STEP 2 — the emailed code. Returns the real admin token.
export const verifyAdminOtp = async (req, res) => {
  try {
    const id = readChallenge(req.body.challenge);
    if (!id) return res.status(400).json({ message: "Your sign-in expired. Please sign in again.", restart: true });

    const admin = await Admin.findById(id).select(OTP_SELECT);
    if (!isAllowedAdmin(admin) || !admin.otpHash) {
      return res.status(400).json({ message: "Please sign in again.", restart: true });
    }
    if (admin.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "This code has expired. Tap Resend code.", expired: true });
    }

    if (!otpMatches(req.body.code, admin.otpHash)) {
      admin.otpAttempts = (admin.otpAttempts || 0) + 1;
      if (admin.otpAttempts >= OTP_MAX_ATTEMPTS) {
        admin.otpHash = undefined;
        admin.otpExpiresAt = undefined;
        await admin.save();
        return res.status(400).json({ message: "Too many wrong codes. Please sign in again.", restart: true });
      }
      await admin.save();
      const left = OTP_MAX_ATTEMPTS - admin.otpAttempts;
      return res.status(400).json({ message: `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` });
    }

    admin.otpHash = undefined;
    admin.otpExpiresAt = undefined;
    admin.otpAttempts = 0;
    await admin.save();

    res.json({
      token: generateAdminToken(admin._id),
      admin: { id: admin._id, username: admin.username, email: admin.email, name: admin.name },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Resend the code (once per minute) without re-entering the password.
export const resendAdminOtp = async (req, res) => {
  try {
    const id = readChallenge(req.body.challenge);
    if (!id) return res.status(400).json({ message: "Your sign-in expired. Please sign in again.", restart: true });

    const admin = await Admin.findById(id).select(OTP_SELECT);
    if (!isAllowedAdmin(admin)) return res.status(400).json({ message: "Please sign in again.", restart: true });

    const wait = admin.otpSentAt ? admin.otpSentAt.getTime() + OTP_RESEND_MS - Date.now() : 0;
    if (wait > 0) {
      return res.status(429).json({ message: `Please wait ${Math.ceil(wait / 1000)}s before resending.`, resendInSeconds: Math.ceil(wait / 1000) });
    }
    if (!(await sendAdminOtp(admin))) {
      return res.status(502).json({ message: "Couldn't send the login code. Please try again." });
    }
    res.json(otpStepResponse(admin));
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
    await Workout.deleteMany({ user: req.params.id });   // clean up their workouts too
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
    const rangeStart = new Date(now.getTime() - range * DAY_MS);
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
      Workout.countDocuments(),
      Workout.countDocuments({ createdAt: { $gte: rangeStart } }),

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
      Workout.aggregate(exerciseUsagePipeline(50)),

      // --- good vs bad rep totals (only AR sets carry these) ---
      Workout.aggregate([
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

      // --- workout usage trend (per day, within range) ---
      Workout.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // --- new users trend (per day, within range) ---
      User.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // --- feedback summary + rating distribution ---
      Feedback.aggregate([
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

      Feedback.find().sort({ createdAt: -1 }).limit(20).populate("user", "name username photo"),
      LoginEvent.find().sort({ createdAt: -1 }).limit(20).populate("user", "name username photo"),
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
        usageTrend: workoutTrend.map((d) => ({ date: d._id, count: d.count })),
      },
      analytics: {
        newUsersTrend: newUserTrend.map((d) => ({ date: d._id, count: d.count })),
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
    const usage = await Workout.aggregate(exerciseUsagePipeline(100));
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
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");

    const result = await Workout.aggregate([
      { $unwind: "$exercises" },
      { $addFields: { exLower: { $toLower: "$exercises.name" } } },
      { $match: { exLower: exercise } },
      { $group: { _id: "$user", sessions: { $sum: 1 }, lastUsed: { $max: "$createdAt" } } },
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