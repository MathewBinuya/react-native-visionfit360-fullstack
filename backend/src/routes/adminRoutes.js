import express from "express";
import adminProtect from "../middleware/admin.middleware.js";
import {
  adminLogin, getStats,
  getUsers, getUserById, deleteUser, updateUserStatus,   
  getExercises, createExercise, updateExercise, deleteExercise,
} from "../controller/adminController.js";


const router = express.Router();

// public
router.post("/login", adminLogin);

// protected (admin only)
router.get("/stats", adminProtect, getStats);

router.get("/users", adminProtect, getUsers);
router.get("/users/:id", adminProtect, getUserById);
router.delete("/users/:id", adminProtect, deleteUser);
router.patch("/users/:id/status", adminProtect, updateUserStatus);

router.get("/exercises", adminProtect, getExercises);
router.post("/exercises", adminProtect, createExercise);
router.put("/exercises/:id", adminProtect, updateExercise);
router.delete("/exercises/:id", adminProtect, deleteExercise);

export default router;