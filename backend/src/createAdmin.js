import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/admin.model.js";
dotenv.config();

const { ADMIN_EMAIL } = await import("./lib/adminAccess.js");

// Ensures the single allowed admin account (ADMIN_EMAIL) exists.
//  - already exists          -> nothing to do
//  - another admin exists     -> its email is moved to ADMIN_EMAIL (password unchanged)
//  - no admin at all          -> created with ADMIN_PASSWORD from the environment
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (await Admin.findOne({ email: ADMIN_EMAIL })) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const existing = await Admin.findOne();
  if (existing) {
    const old = existing.email;
    existing.email = ADMIN_EMAIL;
    await existing.save();
    console.log(`Admin email moved: ${old} -> ${ADMIN_EMAIL} (password unchanged)`);
    return;
  }

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
    console.log("No admin exists. Set ADMIN_PASSWORD (8+ characters) and run again.");
    return;
  }
  await Admin.create({ username: "admin", email: ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, name: "Administrator" });
  console.log(`Admin created: ${ADMIN_EMAIL}`);
};

run()
  .catch((e) => console.log("createAdmin failed:", e.message))
  .finally(() => mongoose.disconnect());
