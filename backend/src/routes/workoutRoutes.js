import express from "express";
import auth from "../middleware/auth.middleware.js";
import {
  createWorkout,
  getWorkouts,
  getWorkout,
  updateWorkout,
  completeWorkout,
  deleteWorkout,
  getExerciseProgress,
} from "../controller/workoutController.js";

const router = express.Router();

router.post("/", auth, createWorkout);
router.get("/", auth, getWorkouts);                          //  completed=true/false to filter
router.get("/progress/:name", auth, getExerciseProgress);   // progressive overload
router.patch("/:id/complete", auth, completeWorkout);      //   mark as done
router.get("/:id", auth, getWorkout);
router.put("/:id", auth, updateWorkout);
router.delete("/:id", auth, deleteWorkout);

export default router;