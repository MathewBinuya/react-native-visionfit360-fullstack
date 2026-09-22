import express from "express";
import { register, login, forgotPassword, resetPassword, verifyEmail, resendVerificationCode } from "../controller/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);   
router.post("/reset-password", resetPassword);   
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);  

export default router;