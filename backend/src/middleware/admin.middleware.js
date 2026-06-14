import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";

const adminProtect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // admin tokens carry role: "admin"
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) return res.status(401).json({ message: "Admin not found" });

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default adminProtect;