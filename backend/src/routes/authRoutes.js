import express from "express";
import { register, login, forgotPassword, resetPassword } from "../controller/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);   // step 1: get reset code
router.post("/reset-password", resetPassword);     // step 2: use code + set new password

export default router;