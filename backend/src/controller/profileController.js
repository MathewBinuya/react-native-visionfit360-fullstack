import User from "../models/user.model.js";
import { cloudinary } from "../lib/cloudinary.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, photo, bio, dateOfBirth, gender, heightCm, weightKg } = req.body;
    const updates = { name, photo, bio, dateOfBirth, gender, heightCm, weightKg };
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: req.file.path },
      { new: true }
    ).select("-password");

    res.json({ photo: user.photo, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePhoto = async (req, res) => {
  try {
    await cloudinary.uploader.destroy(`profile_photos/user_${req.user.id}`);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: "" },
      { new: true }
    ).select("-password");

    res.json({ message: "Photo removed", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const completeOnBoarding = async (req, res) => {
  try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { onBoardingComplete: true },
        { new: true }
      ).select("-password");

      res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};