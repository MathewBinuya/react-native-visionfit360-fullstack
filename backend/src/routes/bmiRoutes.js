import express from "express";
import auth from "../middleware/auth.middleware.js";
import { calculateBMI } from "../controller/bmiController.js";

const router = express.Router();

router.post("/", auth, calculateBMI);

export default router;