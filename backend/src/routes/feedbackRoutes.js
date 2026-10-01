import express from "express";
import auth from "../middleware/auth.middleware.js";
import { submitFeedback } from "../controller/feedbackController.js";

const router = express.Router();

// user submits feedback; admin reading is handled by the admin routes/aggregations
router.post("/", auth, submitFeedback);

export default router;
