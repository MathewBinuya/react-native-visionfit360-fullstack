import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import { isAllowedEmail, normalizeEmail } from "../utils/emailValidator.js";

const MONGO_URI = process.env.MONGO_URI; // change if your .env uses another name

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const users = await User.find({});
  let updated = 0;
  const conflicts = [];
  const disallowed = [];

  for (const user of users) {
    if (!isAllowedEmail(user.email)) disallowed.push(user.email);

    const normalized = normalizeEmail(user.email);
    if (normalized === user.email) continue;

    const clash = await User.findOne({ email: normalized, _id: { $ne: user._id } });
    if (clash) {
      conflicts.push(`${user.email} -> ${normalized} (already used by another account)`);
      continue;
    }

    await User.updateOne({ _id: user._id }, { $set: { email: normalized } });
    console.log(`Updated: ${user.email} -> ${normalized}`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated} of ${users.length} users.`);
  if (conflicts.length) {
    console.log("\nCONFLICTS (fix manually):");
    conflicts.forEach((c) => console.log("  " + c));
  }
  if (disallowed.length) {
    console.log("\nNot Gmail/Outlook/Yahoo (review or delete):");
    disallowed.forEach((e) => console.log("  " + e));
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});