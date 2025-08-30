// src/middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_ROOT = path.resolve("uploads");
const FOOD_SUBDIR = "foods";
const FOOD_DIR = path.join(UPLOAD_ROOT, FOOD_SUBDIR);

// make sure folders exist
fs.mkdirSync(FOOD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FOOD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || "") || ".jpg").toLowerCase();
    const base = (path.basename(file.originalname || "image", ext) || "image")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, "_")
      .slice(0, 40);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = (path.extname(file.originalname || "") || "").toLowerCase();

  const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const looksImageMime = mime.startsWith("image/");
  const looksImageByExt = allowedExt.includes(ext);

  // RN/Android often sends "application/octet-stream". Allow if the extension looks like an image.
  if (looksImageMime || (mime === "application/octet-stream" && looksImageByExt)) {
    return cb(null, true);
  }

  cb(new Error("Only image files are allowed"));
}


export const uploadFoodImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

export const FOOD_UPLOAD_SUBDIR = FOOD_SUBDIR; 
