import express from "express";
import path from "path";
import fs from "fs";
import { FoodItem } from "../models/FoodItem.js";
import { uploadFoodImage, FOOD_UPLOAD_SUBDIR } from "../middleware/upload.js";
// If you want to protect with JWT later, import auth and add it to routes.
// import { auth } from "../middleware/auth.js";

const router = express.Router();

// helper to build absolute URL for a stored file
function makePublicUrl(req, relPath) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${relPath}`; // relPath like "foods/filename.jpg"
}

// GET /api/foods
router.get("/", async (_req, res) => {
  const items = await FoodItem.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

// POST /api/foods  (multipart/form-data with fields + image)
router.post("/", uploadFoodImage.single("image"), async (req, res) => {
  try {
    const { name, price, category, available = "true", tax = "0" } = req.body || {};
    if (!name || !price || !category) {
      return res.status(400).json({ error: "name, price, category are required" });
    }

    const doc = new FoodItem({
      name: String(name).trim(),
      price: Number(price),
      category: String(category).trim(),
      available: String(available).toLowerCase() !== "false",
      tax: Number(tax || 0),
    });

    if (req.file) {
      const rel = `${FOOD_UPLOAD_SUBDIR}/${req.file.filename}`;
      doc.imagePath = rel;
      doc.imageUrl = makePublicUrl(req, rel);
    }

    await doc.save();
    res.status(201).json(doc.toObject());
  } catch (e) {
    console.error("Create food error:", e);
    res.status(500).json({ error: "Failed to create food item" });
  }
});

// PATCH /api/foods/:id  (JSON OR multipart if changing image)
router.patch("/:id", uploadFoodImage.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const patch = {};

    if (body.name != null) patch.name = String(body.name).trim();
    if (body.price != null) patch.price = Number(body.price);
    if (body.category != null) patch.category = String(body.category).trim();
    if (body.tax != null) patch.tax = Number(body.tax);
    if (body.available != null) patch.available = String(body.available).toLowerCase() !== "false";

    if (req.file) {
      // replace image
      const rel = `${FOOD_UPLOAD_SUBDIR}/${req.file.filename}`;
      patch.imagePath = rel;
      // build absolute URL
      patch.imageUrl = makePublicUrl(req, rel);
    }

    const updated = await FoodItem.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) {
    console.error("Update food error:", e);
    res.status(500).json({ error: "Failed to update food item" });
  }
});

// DELETE /api/foods/:id
router.delete("/:id", async (req, res) => {
  try {
    const doc = await FoodItem.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    // try to delete file if present
    if (doc.imagePath) {
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
