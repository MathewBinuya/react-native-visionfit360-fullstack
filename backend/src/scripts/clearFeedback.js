import "dotenv/config";
import mongoose from "mongoose";
import Feedback from "../models/feedback.model.js";

// One-off cleanup: delete ALL existing user-feedback records so the admin
// Feedback tab starts clean for the demo. This removes DATA ONLY — the Feedback
// model, API, mobile submit flow and admin page are all left intact, so users can
// keep submitting feedback and new entries appear in the Feedback tab as normal.
//
// Run from the backend/ folder:  node src/scripts/clearFeedback.js
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is not set. Add it to backend/.env first.");
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const before = await Feedback.countDocuments();
  const { deletedCount } = await Feedback.deleteMany({});
  const after = await Feedback.countDocuments();

  console.log(`Feedback records before: ${before}`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Feedback records now:    ${after}`);

  await mongoose.disconnect();
  console.log("Done. The Feedback tab is now clean; new submissions still work.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
