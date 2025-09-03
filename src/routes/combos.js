// src/routes/combos.js
import express from "express";
import { Combo } from "../models/Combo.js";
import { FoodItem } from "../models/FoodItem.js";

const router = express.Router();

/** GET /api/combos  -> list combos (with item info) */
router.get("/", async (_req, res) => {
  const docs = await Combo.find()
    .sort({ createdAt: -1 })
    .populate("items", "name price imageUrl")
    .lean();
  res.json(docs);
});

/** POST /api/combos  -> create combo  {name, itemIds[], price, status?} */
router.post("/", async (req, res) => {
  try {
    const { name, itemIds, price, status } = req.body;
    if (!name || !Array.isArray(itemIds) || itemIds.length === 0 || price == null) {
      return res.status(400).json({ error: "name, itemIds[], price are required" });
    }

    // Validate all items exist
    const found = await FoodItem.find({ _id: { $in: itemIds } }).select("_id").lean();
    if (found.length !== itemIds.length) {
      return res.status(400).json({ error: "One or more itemIds are invalid" });
    }

    const combo = await Combo.create({
      name: name.trim(),
      items: itemIds,
      price: Number(price),
      status: status === "Inactive" ? "Inactive" : "Active",
    });

    const out = await Combo.findById(combo._id).populate("items", "name price imageUrl").lean();
    res.status(201).json(out);
  } catch (e) {
    console.error("POST /combos error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/** PATCH /api/combos/:id  -> partial update */
router.patch("/:id", async (req, res) => {
  try {
    const update = {};
    if (typeof req.body.name === "string") update.name = req.body.name.trim();
    if (Array.isArray(req.body.itemIds) && req.body.itemIds.length > 0) update.items = req.body.itemIds;
    if (req.body.price != null) update.price = Number(req.body.price);
    if (["Active", "Inactive"].includes(req.body.status)) update.status = req.body.status;

    const doc = await Combo.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("items", "name price imageUrl")
      .lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    console.error("PATCH /combos/:id error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/** DELETE /api/combos/:id */
router.delete("/:id", async (req, res) => {
  const r = await Combo.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
