import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

export const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (username.length > 30)
      return res.status(400).json({ message: "Username must be 30 characters or less" });
    if (email.length > 100)
      return res.status(400).json({ message: "Email is too long" });
    if (password.length > 64)
      return res.status(400).json({ message: "Password must be 64 characters or less" });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    if (!/[a-zA-Z]/.test(password))
      return res.status(400).json({ message: "Password must include at least one letter" });
    if (!/[0-9]/.test(password))
      return res.status(400).json({ message: "Password must include at least one number" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Please enter a valid email address" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: "Email already exists" });

    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: "Username already exists" });

    const user = new User({ email, username, password });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        onBoardingComplete: user.onBoardingComplete,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    user.currentToken = token;
    await user.save();

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        onBoardingComplete: user.onBoardingComplete,
        photo: user.photo,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// Uses Gmail SMTP directly. Requires a paid Render instance (Starter or above) —
// Render's free tier blocks outbound SMTP ports (25/465/587).
// GMAIL_PASS must be a Gmail App Password (16 chars, no spaces) — not your
// regular Gmail login password.
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(200).json({
        message: "If that email is registered, a reset code has been sent.",
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    user.resetToken = crypto.createHash("sha256").update(resetCode).digest("hex");
    user.resetTokenExpiry = expiry;
    await user.save();

    console.log("Sending reset email to:", user.email);

    await transporter.sendMail({
      from: `"VisionFIT360" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: "VisionFIT360 — Your Password Reset Code",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f7f7f7; border-radius: 12px;">
          <h2 style="color: #111111; margin-bottom: 8px;">Password Reset</h2>
          <p style="color: #555; margin-bottom: 24px;">You requested a password reset for your VisionFIT360 account.</p>
          <div style="background: #ffffff; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #888; font-size: 13px; margin-bottom: 8px;">YOUR RESET CODE</p>
            <p style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #111111; margin: 0;">${resetCode}</p>
          </div>
          <p style="color: #888; font-size: 13px; text-align: center;">This code expires in <strong>15 minutes</strong>.</p>
          <p style="color: #bbb; font-size: 12px; text-align: center; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      message: "Reset code sent to your email.",
    });
  } catch (error) {
    console.log("Error in forgotPassword:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    if (!/[a-zA-Z]/.test(newPassword))
      return res.status(400).json({ message: "Password must include at least one letter" });
    if (!/[0-9]/.test(newPassword))
      return res.status(400).json({ message: "Password must include at least one number" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user)
      return res.status(400).json({ message: "Invalid reset request" });

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date())
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });

    const hashedCode = crypto.createHash("sha256").update(resetCode.trim()).digest("hex");
    if (user.resetToken !== hashedCode)
      return res.status(400).json({ message: "Invalid reset code" });

    user.password = newPassword;
    user.resetToken = "";
    user.resetTokenExpiry = null;
    user.currentToken = "";
    await user.save();

    res.status(200).json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (error) {
    console.log("Error in resetPassword", error);
    res.status(500).json({ message: "Internal server error" });
  }
};