import express from "express";
import auth from "../middleware/auth.middleware.js";
import { recommendWorkout, chatWithCoach } from "../controller/aiController.js";

const router = express.Router();

router.post("/recommend", auth, recommendWorkout);
router.post("/chat", auth, chatWithCoach);



export default router;