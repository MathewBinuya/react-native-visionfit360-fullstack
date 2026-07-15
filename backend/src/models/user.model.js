import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: true, 
      unique: true 
    },
    email: { 
      type: String, 
      required: 
      true,
       unique: true
     },
    password: { 
      type: String, 
      required: true, 
      minlength: 6 
    },
    onBoardingComplete: { 
      type: Boolean, 
      default: false 
    },
    name: { 
      type: String, 
      default: "" 
    },
    photo: { 
      type: String,
      default: "" 
    },
    bio: { 
      type: String,
      default: "" 
    },
    dateOfBirth: Date,
    gender: { 
      type: String, 
      enum: ["male", "female", "other"] 
    },
    heightCm: Number,
    weightKg: Number,
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

export default mongoose.model("User", userSchema);