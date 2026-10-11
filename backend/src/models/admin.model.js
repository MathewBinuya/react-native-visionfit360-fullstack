import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    name: { type: String, default: "Admin" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // pending login code (email OTP) — hashed, never returned by default
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpSentAt: { type: Date, select: false },
    otpChallengeId: { type: String, select: false }, // the one pending sign-in allowed to finish
    // authenticator app (TOTP) — secret encrypted at rest, backup codes hashed
    totpEnabled: { type: Boolean, default: false },
    totpSecretEnc: { type: String, select: false },
    totpPendingEnc: { type: String, select: false }, // during setup, before the first code is confirmed
    totpLastStep: { type: Number, select: false },   // blocks reusing a code
    backupCodes: { type: [String], select: false },
  },
  { timestamps: true },
  
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.comparePassword = async function (candidate) {
  return await bcrypt.compare(candidate, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;