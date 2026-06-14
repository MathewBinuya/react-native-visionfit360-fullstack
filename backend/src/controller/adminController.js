import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Workout from "../models/workout.model.js";
import Exercise from "../models/exercise.model.js";

const generateAdminToken = (id) =>
  jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });

// --- AUTH ---
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

// --- ANALYTICS ---
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

// --- USER MANAGEMENT ---
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    const workouts = await Workout.find({ user: user._id }).sort({ createdAt: -1 });
    res.json({ user, workouts });
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

// --- EXERCISE / CONTENT MANAGEMENT ---
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
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};