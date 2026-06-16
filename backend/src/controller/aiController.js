import { model } from "../lib/gemini.js";
import User from "../models/user.model.js";
import Workout from "../models/workout.model.js";

// --- helper: call Gemini with automatic retry on rate limit (429) ---
const generateWithRetry = async (payload, maxRetries = 3) => {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(payload);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      const msg = (err?.message || "").toLowerCase();
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("rate") ||
        msg.includes("quota") ||
        msg.includes("resource has been exhausted");

      // only retry on rate-limit errors, and not after the last attempt
      if (isRateLimit && attempt < maxRetries) {
        // exponential backoff: wait longer each time (1s, 2s, 4s)
        const waitMs = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err; // not a rate limit, or out of retries
    }
  }
  throw lastErr;
};

// detect rate-limit errors so we can return a friendly message
const isRateLimitError = (err) => {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("resource has been exhausted")
  );
};

// build a short context string about the user
const buildUserContext = async (userId) => {
  const user = await User.findById(userId).select("-password");
  const recent = await Workout.find({ user: userId, completed: true })
    .sort({ date: -1 })
    .limit(5);

  let bmiLine = "BMI unknown";
  if (user?.heightCm && user?.weightKg) {
    const h = user.heightCm / 100;
    const bmi = (user.weightKg / (h * h)).toFixed(1);
    bmiLine = `BMI ${bmi} (height ${user.heightCm}cm, weight ${user.weightKg}kg)`;
  }

  const recentLine = recent.length
    ? recent.map((w) => `${w.title} (${w.exercises?.length || 0} exercises)`).join(", ")
    : "no recent workouts";

  return `User profile: ${bmiLine}. Gender: ${user?.gender || "unspecified"}. Recent workouts: ${recentLine}.`;
};

// ai recommend workout recommendation
export const recommendWorkout = async (req, res) => {
  try {
    const context = await buildUserContext(req.user.id);

    const prompt = `You are a friendly, encouraging fitness coach. ${context}
Recommend a single workout for today suited to this person. Keep it concise: a short intro line, then 4-6 exercises with sets and reps. Use plain text, no markdown headers. Be motivating but practical.`;

    const text = await generateWithRetry(prompt);
    res.json({ recommendation: text });
  } catch (err) {
    console.log("AI recommend error", err.message);
    if (isRateLimitError(err)) {
      return res.status(429).json({
        message: "The AI coach is busy right now. Please try again in a few moments.",
      });
    }
    res.status(500).json({ message: "Could not generate recommendation" });
  }
};

//  chat with context history
export const chatWithCoach = async (req, res) => {
  try {
    const { messages } = req.body;
    const context = await buildUserContext(req.user.id);

    // only keep the last 10 messages to reduce tokens/load
    const trimmed = Array.isArray(messages) ? messages.slice(-10) : [];

    const history = [
      {
        role: "user",
        parts: [{ text: `You are a friendly fitness coach for a workout app. ${context} Answer the user's fitness questions concisely and practically. Keep responses short.` }],
      },
      {
        role: "model",
        parts: [{ text: "Got it! I'm ready to help with your fitness questions." }],
      },
      ...trimmed.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];

    const text = await generateWithRetry({ contents: history });
    res.json({ reply: text });
  } catch (err) {
    console.log("AI chat error", err.message);
    if (isRateLimitError(err)) {
      return res.status(429).json({
        message: "The AI coach is busy right now. Please try again in a few moments.",
      });
    }
    res.status(500).json({ message: "Could not get a reply" });
  }
};