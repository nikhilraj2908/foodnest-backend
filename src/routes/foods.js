// src/routes/foods.js
import express from "express";
import path from "path";
import fs from "fs";
import { FoodItem } from "../models/FoodItem.js";
import { uploadFoodImage, FOOD_UPLOAD_SUBDIR } from "../middleware/upload.js";

const router = express.Router();




// Build absolute URL for a stored file
function makePublicUrl(req, relPath) {
  // If you deploy behind a domain, set BASE_URL=https://api.yourdomain.com
  const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${relPath}`;
}

// --- NEW: safely parse rawMaterials from JSON or string (multipart) ---
function parseRawMaterials(input) {
  if (!input) return [];
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(input) ? input : [];
}


/**
 * GET /api/foods
 * Return all items. (You can paginate later.)
 */
router.get("/", async (_req, res) => {
  const docs = await FoodItem.find().sort({ createdAt: -1 }).lean();
  res.json(docs);
});

/**
 * POST /api/foods
 * Create item (multipart). Image field name: "image"
 */
router.post(
  
  "/",
  uploadFoodImage.single("image"),
  async (req, res) => {
    try {
      const { name, price, category, available = true, tax = 0 } = req.body;

      let imagePath = null;
      let imageUrl = null;

      if (req.file) {
        // store relative path like "foods/file.jpg"
        imagePath = path.posix.join(FOOD_UPLOAD_SUBDIR, req.file.filename);
        imageUrl = makePublicUrl(req, imagePath);
      }

      const doc = await FoodItem.create({
        name,
        price,
        category,
        available: String(available) === "true" || available === true,
        tax,
        imagePath,
        imageUrl,
        rawMaterials,
      });

      res.status(201).json(doc);
    } catch (e) {
      console.error("Create food error:", e);
      res.status(500).json({ error: "Failed to create food item" });
    }

    console.log("CT:", req.headers["content-type"]);
console.log("BODY KEYS:", Object.keys(req.body || {}));
console.log("FILE:", req.file ? {
  fieldname: req.file.fieldname,
  originalname: req.file.originalname,
  mimetype: req.file.mimetype,
  size: req.file.size,
  filename: req.file.filename
} : "<none>");

  }

  
);

/**
 * PATCH /api/foods/:id
 * Update item. Accepts either JSON or multipart with optional "image".
 */
router.patch(
  "/:id",
  (req, res, next) => {
    // If Content-Type is multipart, run multer; else skip
    const ct = req.headers["content-type"] || "";
    if (ct.startsWith("multipart/form-data")) {
      return uploadFoodImage.single("image")(req, res, next);
    }
    next();
  },
  async (req, res) => {
    try {
      const id = req.params.id;
      const doc = await FoodItem.findById(id);
      if (!doc) return res.status(404).json({ error: "Not found" });

      const fields = {};
      if (typeof req.body.name !== "undefined") fields.name = req.body.name;
      if (typeof req.body.price !== "undefined") fields.price = req.body.price;
      if (typeof req.body.category !== "undefined") fields.category = req.body.category;
      if (typeof req.body.tax !== "undefined") fields.tax = req.body.tax;
      if (typeof req.body.available !== "undefined") {
        fields.available = String(req.body.available) === "true" || req.body.available === true;
      }

            // NEW: allow updating rawMaterials (works for JSON or multipart)
            if (typeof req.body.rawMaterials !== "undefined") {
              fields.rawMaterials = parseRawMaterials(req.body.rawMaterials);
            }
      
      

      // If a new file was uploaded, delete old file and set new paths
      if (req.file) {
        const newRel = path.posix.join(FOOD_UPLOAD_SUBDIR, req.file.filename);
        const newUrl = makePublicUrl(req, newRel);

        if (doc.imagePath) {
          const absOld = path.resolve("uploads", doc.imagePath);
          fs.promises.unlink(absOld).catch(() => {});
        }

        fields.imagePath = newRel;
        fields.imageUrl = newUrl;
      }

      Object.assign(doc, fields);
      await doc.save();

      res.json(doc);
    } catch (e) {
      console.error("Update food error:", e);
      res.status(500).json({ error: "Failed to update food item" });
    }
  }
);

/**
 * DELETE /api/foods/:id
 * Remove doc + physical file
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await FoodItem.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    if (doc?.imagePath) {
      const abs = path.resolve("uploads", doc.imagePath);
      fs.promises.unlink(abs).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("Delete food error:", e);
    res.status(500).json({ error: "Failed to delete food item" });
  }
});

export default router;
