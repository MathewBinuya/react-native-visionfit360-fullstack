import express from "express";
import "dotenv/config.js";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import bmiRoutes from "./routes/bmiRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";
import aiRoutes from './routes/aiRoutes.js'

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

// job.start();   

app.use(express.json());

app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/bmi", bmiRoutes);
app.use("/api/workouts", workoutRoutes);   

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});