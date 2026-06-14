import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/admin.model.js";
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await Admin.findOne({ email: "admin@visionfit.com" });
  if (existing) { console.log("Admin already exists"); process.exit(0); }
  await Admin.create({
    username: "admin",
    email: "admin@visionfit.com",
    password: "admin123",      // change after first login
    name: "Administrator",
  });
  console.log("Admin created: admin@visionfit.com / admin123");
  process.exit(0);
};
run();