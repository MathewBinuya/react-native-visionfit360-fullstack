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
  // Idempotency key for offline completions synced from the mobile app. Set once,
  // when a workout is first marked complete, so a retried/duplicated sync of the
  // same offline completion is recognised instead of counted twice. Sparse: only
  // offline-completed workouts carry it.
  clientCompletionId: { type: String, index: { unique: true, sparse: true } },
  // Idempotency key for offline-CREATED workouts synced from the mobile app. The
  // client generates it once per new workout and sends it on every create attempt,
  // so a retried/duplicated sync of the same offline creation (dropped response,
  // app restart, repeated sync pass) is recognised instead of inserted twice.
  // Sparse: only offline-created workouts carry it.
  clientWorkoutId: { type: String, index: { unique: true, sparse: true } },
},
 {timestamps: true},
);

// Indexes for admin workout analytics (usage trend, per-exercise distinct users).
workoutSchema.index({ createdAt: -1 });
workoutSchema.index({ "exercises.name": 1 });

export default mongoose.model("Workout", workoutSchema);