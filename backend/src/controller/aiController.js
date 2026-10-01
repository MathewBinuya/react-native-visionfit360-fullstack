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

//  goal guidance — patterns, NOT rigid rules. Keep in sync with the mobile enum.
const GOAL_GUIDANCE = {
  get_fit:
    "Goal: Get Fit — favour general strength, cardio, mobility and consistency.",
  maintain_weight:
    "Goal: Maintain Weight — sustainable activity with a balance of strength and cardio.",
  get_lean:
    "Goal: Get Lean / Ripped — resistance training with progressive overload plus appropriate cardio toward sustainable body-composition goals. No crash diets or extreme advice.",
};

const bmiCategory = (bmi) =>
  bmi < 18.5 ? "underweight" : bmi < 25 ? "normal" : bmi < 30 ? "overweight" : "obese";

//  Build the Gemini context from STRUCTURED, validated fields only.
//  Never include free-text fields (bio, display name).
const buildUserContext = async (userId) => {
  const user = await User.findById(userId).select("-password");
  const recent = await Workout.find({ user: userId, completed: true })
    .sort({ date: -1 })
    .limit(5);

  let bmiLine = "BMI unknown";
  if (user?.heightCm && user?.weightKg) {
    const h = user.heightCm / 100;
    const bmi = user.weightKg / (h * h);
    bmiLine = `BMI ${bmi.toFixed(1)} (${bmiCategory(bmi)}; height ${user.heightCm}cm, weight ${user.weightKg}kg)`;
  }

  const goalLine = user?.goal && GOAL_GUIDANCE[user.goal]
    ? GOAL_GUIDANCE[user.goal]
    : "Goal: not specified — assume general fitness.";

  // light performance signal from recent history (no free text beyond our own titles)
  const activity =
    recent.length >= 3 ? "trains regularly" :
    recent.length >= 1 ? "trains occasionally" :
    "little recent training logged";

  const recentLine = recent.length
    ? recent.map((w) => `${w.title} (${w.exercises?.length || 0} exercises)`).join(", ")
    : "no recent workouts";

  const genderLine = user?.gender
    ? `Gender: ${user.gender} (context only).`
    : "Gender: unspecified.";

  return (
    `User profile: ${bmiLine}. ${goalLine} ${genderLine} Activity: ${activity}. Recent workouts: ${recentLine}. ` +
    `Use all of this as COMBINED context. Do NOT stereotype by gender — never make a workout easier or harder based on gender alone. Tailor to the goal, BMI and training history together.`
  );
};

// ----- server-side validation / clamping of AI output (defense-in-depth) -----
// Gemini output is untrusted. We clamp to sane ranges, drop malformed entries,
// and keep the EXACT response shape the frontend + POST /workouts expect.
const clampInt = (n, lo, hi, dflt) => {
  const x = Number(n);
  if (!isFinite(x)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(x)));
};
const clampFloat = (n, lo, hi, dflt) => {
  const x = Number(n);
  if (!isFinite(x)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(x * 10) / 10));
};

const sanitizeSets = (sets) =>
  (Array.isArray(sets) ? sets : [])
    .slice(0, 12)
    .map((s) => ({
      reps: clampInt(s?.reps, 1, 100, 10),
      weightKg: clampFloat(s?.weightKg, 0, 500, 0),
      restSeconds: clampInt(s?.restSeconds, 0, 600, 60),
    }));

const sanitizeExercises = (exercises) =>
  (Array.isArray(exercises) ? exercises : [])
    .filter((e) => e && typeof e.name === "string" && e.name.trim())
    .slice(0, 15)
    .map((e) => ({ name: e.name.trim().slice(0, 60), sets: sanitizeSets(e.sets) }))
    .filter((e) => e.sets.length > 0);

const sanitizeText = (t, max) =>
  (typeof t === "string" ? t.trim().slice(0, max) : "");

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

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.log("Failed to parse AI JSON response:", raw);
      return res.status(500).json({ message: "Could not generate recommendation. Please try again." });
    }

    // validate + clamp; fall back safely if nothing usable survives
    const exercises = sanitizeExercises(parsed.exercises);
    if (!exercises.length) {
      console.log("AI recommendation had no valid exercises after sanitation");
      return res.status(500).json({ message: "Could not generate recommendation. Please try again." });
    }

    const recommendation = {
      intro: sanitizeText(parsed.intro, 300) || "Here's a workout for today.",
      title: sanitizeText(parsed.title, 80) || "Today's Workout",
      exercises,
    };

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

    const reply = sanitizeText(parsed.reply, 2000) || "Sorry, I couldn't put that together. Try again.";

    if (parsed.responseType === "workout") {
      const exercises = sanitizeExercises(parsed.exercises);
      // Only return a workout if valid exercises survived validation; otherwise
      // degrade gracefully to a plain chat reply (preserves the response shape).
      if (exercises.length) {
        return res.json({
          reply,
          workout: { title: sanitizeText(parsed.title, 80) || "Workout", exercises },
        });
      }
    }

    res.json({ reply });
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
