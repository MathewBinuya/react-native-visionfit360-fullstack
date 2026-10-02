import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
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
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      token: generateAdminToken(admin._id),
      admin: { id: admin._id, username: admin.username, email: admin.email, name: admin.name },
    });
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
      User.countDocuments({ lastLoginAt: { $gte: accountActiveThreshold } }),
      Workout.countDocuments(),
      Workout.countDocuments({ createdAt: { $gte: rangeStart } }),

      // --- demographics: one pass over users, several facets ---
      User.aggregate([
        {
          $facet: {
            gender: [
              { $group: { _id: { $ifNull: ["$gender", "Not specified"] }, count: { $sum: 1 } } },
            ],
            ageGroups: [
              {
                $addFields: {
                  age: {
                    $cond: [
                      { $ifNull: ["$dateOfBirth", false] },
                      { $dateDiff: { startDate: "$dateOfBirth", endDate: "$$NOW", unit: "year" } },
                      null,
                    ],
                  },
                },
              },
              {
                $addFields: {
                  ageGroup: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$age", null] }, then: "Not specified" },
                        { case: { $lt: ["$age", 18] }, then: "Under 18" },
                        { case: { $lt: ["$age", 25] }, then: "18-24" },
                        { case: { $lt: ["$age", 35] }, then: "25-34" },
                        { case: { $lt: ["$age", 45] }, then: "35-44" },
                        { case: { $lt: ["$age", 55] }, then: "45-54" },
                      ],
                      default: "55+",
                    },
                  },
                },
              },
              { $group: { _id: "$ageGroup", count: { $sum: 1 } } },
            ],
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
        ageGroups: demo.ageGroups || [],
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