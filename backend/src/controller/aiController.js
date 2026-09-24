import { SchemaType } from "@google/generative-ai";
import { model } from "../lib/gemini.js";
import User from "../models/user.model.js";
import Workout from "../models/workout.model.js";

//  helper - call Gemini with automatic retry on rate limit (429) 
const generateWithRetry = async (contents, generationConfig, maxRetries = 3) => {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({ contents, generationConfig });
      return result.response.text();
    } catch (err) {
      lastErr = err;
      const msg = (err?.message || "").toLowerCase();
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("rate") ||
        msg.includes("quota") ||
        msg.includes("resource has been exhausted");

      if (isRateLimit && attempt < maxRetries) {
        const waitMs = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

const isRateLimitError = (err) => {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("resource has been exhausted")
  );
};

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

const workoutRecommendationSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: { type: SchemaType.STRING, description: "A short, friendly one-line intro to the workout" },
    title: { type: SchemaType.STRING, description: "A short workout title, e.g. 'Upper Body Day'" },
    exercises: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          sets: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                reps: { type: SchemaType.NUMBER },
                weightKg: { type: SchemaType.NUMBER, description: "0 for bodyweight exercises" },
                restSeconds: { type: SchemaType.NUMBER },
              },
              required: ["reps", "weightKg", "restSeconds"],
            },
          },
        },
        required: ["name", "sets"],
      },
    },
  },
  required: ["intro", "title", "exercises"],
};

export const recommendWorkout = async (req, res) => {
  try {
    const context = await buildUserContext(req.user.id);

    const prompt = `You are a friendly, encouraging fitness coach. ${context}
Recommend a single workout for today suited to this person. Keep the intro short and motivating (one sentence). Include 4-6 exercises with realistic sets, reps, and rest times. Use 0 for weightKg on bodyweight exercises.`;

    const raw = await generateWithRetry(
      [{ role: "user", parts: [{ text: prompt }] }],
      { responseMimeType: "application/json", responseSchema: workoutRecommendationSchema }
    );

    let recommendation;
    try {
      recommendation = JSON.parse(raw);
    } catch (parseErr) {
      console.log("Failed to parse AI JSON response:", raw);
      return res.status(500).json({ message: "Could not generate recommendation. Please try again." });
    }

    res.json({ recommendation });
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

// schema for chat — covers BOTH a normal conversational reply and a workout
// recommendation given mid-chat, so "give me a leg day" becomes trackable too
const chatResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    responseType: {
      type: SchemaType.STRING,
      enum: ["chat", "workout"],
      description: "\"workout\" if the user is asking for a workout, routine, or exercise plan. \"chat\" for anything else.",
    },
    reply: {
      type: SchemaType.STRING,
      description: "Always include this. For \"chat\", the full answer. For \"workout\", a short one-sentence friendly intro.",
    },
    title: {
      type: SchemaType.STRING,
      description: "Workout title — only when responseType is \"workout\"",
    },
    exercises: {
      type: SchemaType.ARRAY,
      description: "Only when responseType is \"workout\" — omit for \"chat\"",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          sets: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                reps: { type: SchemaType.NUMBER },
                weightKg: { type: SchemaType.NUMBER, description: "0 for bodyweight exercises" },
                restSeconds: { type: SchemaType.NUMBER },
              },
              required: ["reps", "weightKg", "restSeconds"],
            },
          },
        },
        required: ["name", "sets"],
      },
    },
  },
  required: ["responseType", "reply"],
};

export const chatWithCoach = async (req, res) => {
  try {
    const { messages } = req.body;
    const context = await buildUserContext(req.user.id);

    const trimmed = Array.isArray(messages) ? messages.slice(-10) : [];

    const history = [
      {
        role: "user",
        parts: [{ text: `You are a friendly fitness coach for a workout app. ${context} Answer the user's fitness questions concisely and practically. Keep responses short. If the user asks for a workout, routine, or exercise plan, set responseType to "workout" and provide structured exercises with realistic sets/reps/rest (use 0 weightKg for bodyweight moves). For anything else, set responseType to "chat".` }],
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

    const raw = await generateWithRetry(
      history,
      { responseMimeType: "application/json", responseSchema: chatResponseSchema }
    );

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.log("Failed to parse AI chat JSON response:", raw);
      return res.status(500).json({ message: "Could not get a reply" });
    }

    if (parsed.responseType === "workout" && parsed.exercises?.length) {
      return res.json({
        reply: parsed.reply,
        workout: { title: parsed.title, exercises: parsed.exercises },
      });
    }

    res.json({ reply: parsed.reply });
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