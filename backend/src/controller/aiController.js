import { model } from "../lib/gemini.js";
import User from "../models/user.model.js";
import Workout from "../models/workout.model.js";

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ recommendation: text });
  } catch (err) {
    console.log("AI recommend error", err.message);
    res.status(500).json({ message: "Could not generate recommendation" });
  }
};

//  chat with context history
export const chatWithCoach = async (req, res) => {
  try {
    const { messages } = req.body; 
    const context = await buildUserContext(req.user.id);

    // turn the chat history into Gemini's format, prepend the system context
    const history = [
      {
        role: "user",
        parts: [{ text: `You are a friendly fitness coach for a workout app. ${context} Answer the user's fitness questions concisely and practically. Keep responses short.` }],
      },
      {
        role: "model",
        parts: [{ text: "Got it! I'm ready to help with your fitness questions." }],
      },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];

    const result = await model.generateContent({ contents: history });
    const text = result.response.text();

    res.json({ reply: text });
  } catch (err) {
    console.log("AI chat error", err.message);
    res.status(500).json({ message: "Could not get a reply" });
  }
};