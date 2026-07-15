import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const auth = async (req, res, next) => {
  try {
    // get token
     const header = req.headers.authorization;
   
     if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 


    // fetch user and verify token matches stored one (single-session enforcement)
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    // if token doesn't match stored token - someone else logged in - force logout
    if(user.currentToken !== token) {
      return res.status(401).json({message: "Session expired. Please log in again."});
    }

    req.user = { id: user._id };
    next();
  

} catch (error) {
    console.error("Error in auth middleware:", error);
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default auth;