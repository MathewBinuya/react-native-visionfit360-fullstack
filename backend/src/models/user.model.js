import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    onBoardingComplete: { type: Boolean, default: false },
    name: { type: String, default: "" },
    photo: { type: String, default: "" },
    bio: { type: String, default: "" },
    dateOfBirth: Date,
    gender: { type: String, enum: ["male", "female", "other"] },
    // fitness goal — optional with a safe default; existing users read as "get_fit"
    // only after they save, so consumers must still handle a missing value.
    goal: { type: String, enum: ["get_fit", "maintain_weight", "get_lean"], default: "get_fit" },
    heightCm: Number,
    weightKg: Number,
    currentToken: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // --- login / presence tracking (additive; existing users simply have these unset) ---
    lastLoginAt: { type: Date, default: null },   // stamped on each successful login
    lastActiveAt: { type: Date, default: null },  // updated by the app heartbeat / activity
    // forgot password fields
    resetToken: { type: String, default: "" },
    resetTokenExpiry: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: "" },
    verificationCodeExpiry: { type: Date, default: null },
  },
  
  { timestamps: true }
);

// Indexes for the admin dashboard aggregations (registration trend, presence, demographics).
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ lastLoginAt: -1 });
userSchema.index({ gender: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

export default mongoose.model("User", userSchema);