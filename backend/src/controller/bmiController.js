import User from "../models/user.model.js";

const classify = (bmi) => {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

export const calculateBMI = async (req, res) => {
  try {
    let { heightCm, weightKg } = req.body;

    if (!heightCm || !weightKg) {
      const user = await User.findById(req.user.id);
      heightCm = heightCm || user.heightCm;
      weightKg = weightKg || user.weightKg;
    }

    if (!heightCm || !weightKg)
      return res.status(400).json({ message: "Height and weight required" });

    const heightM = heightCm / 100;
    const bmi = +(weightKg / (heightM * heightM)).toFixed(1);

    res.json({ bmi, category: classify(bmi), heightCm, weightKg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};