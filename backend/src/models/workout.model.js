import mongoose from "mongoose";

const setSchema = new mongoose.Schema({
  reps: Number,
  weightKg: Number,
  restSeconds: Number,
  // AR form quality (optional). Set by RepVision sessions; left unset for manual sets.
  goodReps: Number,
  badReps: Number,
  completed: {
    type: Boolean,
    default: false,
  },
},
 {_id: false},
);

const exerciseEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sets: [setSchema],
},
 {_id:false}
);

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: String,
  date: {
    type: Date,
    default: Date.now
  },
  exercises: [exerciseEntrySchema],
  durationMinutes: Number,
  notes: String,
  completed: { type: Boolean, default: false },   
  completedAt: Date, 
},
 {timestamps: true},
);

// Indexes for admin workout analytics (usage trend, per-exercise distinct users).
workoutSchema.index({ createdAt: -1 });
workoutSchema.index({ "exercises.name": 1 });

export default mongoose.model("Workout", workoutSchema);