import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Profile photos: one image per user (re-uploads overwrite), face-cropped to 500x500.
// All options are fixed server-side — nothing from the request is passed through.
const PROFILE_PHOTO_OPTIONS = {
  folder: "profile_photos",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
  overwrite: true,
  invalidate: true,
  resource_type: "image",
};

// Uploads an in-memory image buffer and resolves with Cloudinary's result.
const uploadProfilePhoto = (buffer, userId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...PROFILE_PHOTO_OPTIONS, public_id: `user_${userId}` },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

export { cloudinary, uploadProfilePhoto };
