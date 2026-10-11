import multer from "multer";
import { uploadProfilePhoto } from "../lib/cloudinary.js";

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

// Sends the buffered file to Cloudinary and exposes the hosted URL as
// req.file.path (what controllers read), then drops the buffer.
const toCloudinary = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const result = await uploadProfilePhoto(req.file.buffer, req.user.id);
    req.file.path = result.secure_url;
    req.file.filename = result.public_id;
    delete req.file.buffer;
    next();
  } catch (err) {
    console.log("Cloudinary upload failed:", err.message);
    res.status(400).json({ message: "Couldn't upload the photo. Use a JPG, PNG or WebP image." });
  }
};

// Turns multer errors (wrong type, too large) into a 400 JSON message.
const receive = (field) => (req, res, next) =>
  memoryUpload.single(field)(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Photo must be 5MB or smaller." : err.message || "Upload failed";
    res.status(400).json({ message });
  });

// Usage unchanged: upload.single("photo") -> [receive file, upload to Cloudinary]
const upload = {
  single: (field) => [receive(field), toCloudinary],
};

export default upload;
