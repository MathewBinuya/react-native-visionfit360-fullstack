import express from "express";
import adminProtect from "../middleware/admin.middleware.js";
import {
  adminLogin, verifyAdminOtp, resendAdminOtp,
  getTwoFactorStatus, startTwoFactorSetup, confirmTwoFactorSetup, regenerateBackupCodes, disableTwoFactor,
  getStats, getDashboard, getPresence,
  getExerciseUsage, getUsersByExercise,
  getUsers, getUserById, deleteUser, updateUserStatus,
  getExercises, createExercise, updateExercise, deleteExercise,
} from "../controller/adminController.js";


const router = express.Router();

// public
router.post("/login", adminLogin);              // step 1: password -> emails a code
router.post("/login/verify", verifyAdminOtp);   // step 2: code -> admin token
router.post("/login/resend", resendAdminOtp);   // resend code (60s cooldown)

// protected (admin only)
router.get("/security/2fa", adminProtect, getTwoFactorStatus);
router.post("/security/2fa/setup", adminProtect, startTwoFactorSetup);         // returns QR data (signed-in only)
router.post("/security/2fa/enable", adminProtect, confirmTwoFactorSetup);      // first code -> on + backup codes
router.post("/security/2fa/backup-codes", adminProtect, regenerateBackupCodes);
router.post("/security/2fa/disable", adminProtect, disableTwoFactor);

router.get("/stats", adminProtect, getStats);         // legacy counts (kept for back-compat)
router.get("/dashboard", adminProtect, getDashboard); // full aggregated dashboard
router.get("/presence", adminProtect, getPresence);   // lightweight presence (poll frequently)

// users-per-exercise page
router.get("/exercise-usage", adminProtect, getExerciseUsage);                 // card counts
router.get("/exercise-usage/:exercise/users", adminProtect, getUsersByExercise); // drill-down

router.get("/users", adminProtect, getUsers);
router.get("/users/:id", adminProtect, getUserById);
router.delete("/users/:id", adminProtect, deleteUser);
router.patch("/users/:id/status", adminProtect, updateUserStatus);

router.get("/exercises", adminProtect, getExercises);
router.post("/exercises", adminProtect, createExercise);
router.put("/exercises/:id", adminProtect, updateExercise);
router.delete("/exercises/:id", adminProtect, deleteExercise);

export default router;