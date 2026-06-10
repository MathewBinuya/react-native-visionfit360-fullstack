import Workout from "../models/workout.model.js";

export const createWorkout = async (req, res) => {
  try {
    const workout = await Workout.create({ ...req.body, user: req.user.id });
    res.status(201).json(workout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getWorkouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, completed } = req.query;

    //  completed status
    const filter = { user: req.user.id };
    if (completed === "true") filter.completed = true;
    if (completed === "false") filter.completed = false;

    const workouts = await Workout.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(workouts); 
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user.id });
    if (!workout) return res.status(404).json({ message: "Not found" });
    res.json(workout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!workout) return res.status(404).json({ message: "Not found" });
    res.json(workout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

//  mark a workout as done - moves it to history
export const completeWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { completed: true, completedAt: new Date() },
      { new: true }
    );
    if (!workout) return res.status(404).json({ message: "Not found" });
    res.json(workout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!workout) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getExerciseProgress = async (req, res) => {
  try {
    const { name } = req.params;
    const workouts = await Workout.find({
      user: req.user.id,
      "exercises.name": name,
    }).sort({ date: 1 });

    const progress = workouts.map((w) => {
      const ex = w.exercises.find((e) => e.name === name);
      const maxWeight = Math.max(...ex.sets.map((s) => s.weightKg || 0));
      const totalVolume = ex.sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weightKg || 0), 0);
      return { date: w.date, maxWeight, totalVolume };
    });

    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};