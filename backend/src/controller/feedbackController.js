import Feedback from "../models/feedback.model.js";

// --- USER SIDE: submit feedback (mounted under user auth) ---
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numRating = Number(rating);

    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }

    const feedback = await Feedback.create({
      user: req.user.id,
      rating: numRating,
      comment: (comment || "").toString().trim().slice(0, 1000),
    });

    res.status(201).json({ message: "Thanks for your feedback!", feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
