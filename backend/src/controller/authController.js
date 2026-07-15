import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js"

export const register = async (req, res) => {
  try {
    const {email, username, password} = req.body;

    if(!username || !email || !password) {
      return res.status(400).json({message: "All fields are required"});
    }

    // length caps (prevent oversized input / DoS abuse)
    if(username.length > 30) {
      return res.status(400).json({message: "Username must be 30 characters or less"});
    }
    if(email.length > 100) {
      return res.status(400).json({message: "Email is too long"});
    }
    if(password.length > 14) {
      return res.status(400).json({message: "Password must be 64 characters or less"});
    }

    // password strength: 8+ chars, at least one letter and one number
    if(password.length < 8) {
      return res.status(400).json({message: "Password must be at least 8 characters long"});
    }
    if(!/[a-zA-Z]/.test(password)) {
      return res.status(400).json({message: "Password must include at least one letter"});
    }
    if(!/[0-9]/.test(password)) {
      return res.status(400).json({message: "Password must include at least one number"});
    }

    // basic email format check
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({message: "Please enter a valid email address"});
    }

    const existingEmail = await User.findOne({ email });
    if(existingEmail) {
      return res.status(400).json({message: "Email already exists"});
    }

    const existingUsername = await User.findOne({ username });
    if(existingUsername) {
      return res.status(400).json({message: "Username already exists"});
    }

    const user = new User({ email, username, password });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        onBoardingComplete: user.onBoardingComplete,
        createdAt: user.createdAt
      },
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const {email, password} = req.body;

    if(!email || !password) return res.status(400).json({message: "All fields are required"});

    const user = await User.findOne({email});
    if(!user) return res.status(400).json({message: "Invalid credentials"});

    const isPasswordCorrect = await user.comparePassword(password);
    if(!isPasswordCorrect) return res.status(400).json({message: "Invalid credentials"});

    const token = generateToken(user._id);

    // save token to DB - invalidates any previous sessions
    user.currentToken = token;
    await user.save();

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        onBoardingComplete: user.onBoardingComplete,
        photo: user.photo,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

