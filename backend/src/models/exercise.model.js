import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },   // matches posedetect.html registry
    label: { type: String, required: true },
    group: { type: String, default: "General" },
    icon: { type: String, default: "body-outline" },
    targetReps: { type: Number, default: 12 },
    working: { type: Boolean, default: true },
    tips: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Exercise = mongoose.model("Exercise", exerciseSchema);
export default Exercise;  