import mongoose from "mongoose";

// User-submitted feedback (star rating + optional comment). Submitted from the mobile
// app, read by admins. This is the ONLY feedback system — distinct from the AR
// form-feedback shown inside the camera view.
const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
