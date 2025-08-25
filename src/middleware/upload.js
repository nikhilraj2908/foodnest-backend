import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_ROOT = path.resolve("uploads");
const FOOD_SUBDIR = "foods";
const FOOD_DIR = path.join(UPLOAD_ROOT, FOOD_SUBDIR);

// ensure folders exist
fs.mkdirSync(FOOD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FOOD_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const base = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    cb(null, `${base}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const ok = /image\/(jpeg|jpg|png|webp|gif)/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed"));
  cb(null, true);
}

export const uploadFoodImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const FOOD_UPLOAD_SUBDIR = FOOD_SUBDIR; // "foods"
