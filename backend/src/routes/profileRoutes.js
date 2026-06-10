import express from "express";
import auth from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  getProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  completeOnBoarding,
} from "../controller/profileController.js";

const router = express.Router();

router.get("/", auth, getProfile);
router.put("/", auth, updateProfile);

router.post("/photo", auth, upload.single("photo"), uploadPhoto);
router.delete("/photo", auth, deletePhoto);

router.put("/complete-onboarding", auth, completeOnBoarding);

export default router;