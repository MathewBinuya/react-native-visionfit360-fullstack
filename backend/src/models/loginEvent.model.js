import mongoose from "mongoose";
import { LOGIN_EVENT_TTL_DAYS } from "../lib/presence.js";

// A lightweight append-only log of successful logins, used for the "recent logins"
// admin view and login trends. Auto-expires via a TTL index so it never grows unbounded.
const loginEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL: drop events older than LOGIN_EVENT_TTL_DAYS.
loginEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: LOGIN_EVENT_TTL_DAYS * 24 * 60 * 60 }
);

export default mongoose.model("LoginEvent", loginEventSchema);
