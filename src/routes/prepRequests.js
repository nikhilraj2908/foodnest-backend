// src/routes/prepRequests.js
import express from "express";
import { PrepRequest } from "../models/PrepRequest.js";
import { FoodItem } from "../models/FoodItem.js";

const router = express.Router();

// Small helper: allow multiple roles
function permit(...roles) {
  return (req, res, next) => {
    const r = req.user?.role;
    if (!r || !roles.includes(r)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

/**
 * POST /api/prep-requests
 * body: { foodId, cookId, quantityToPrepare? }
 * roles: supervisor OR superadmin
 */
router.post("/", permit("supervisor", "superadmin"), async (req, res) => {
  try {
    const { foodId, cookId, quantityToPrepare } = req.body || {};

    const food = await FoodItem.findById(foodId).lean();
    if (!food) return res.status(404).json({ error: "Food not found" });

    const doc = await PrepRequest.create({
      foodId,
      cookId,
      requestedBy: req.user.id,
      quantityToPrepare: typeof quantityToPrepare === "number" ? quantityToPrepare : 0,
      foodSnapshot: {
        name: food.name,
        price: food.price,
        category: food.category,
        tax: food.tax,
        available: food.available,
        imageUrl: food.imageUrl,
        rawMaterials: food.rawMaterials || [],
        totalQuantity: food.totalQuantity || undefined,
        perServing: food.perServing || undefined,
      },
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error("Create prep request error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/prep-requests?cookId=...&status=...
 * roles: any authenticated user (cook will call this)
 */
router.get("/", async (req, res) => {
  try {
    const { cookId, status } = req.query;
    const q = {};
    if (cookId) q.cookId = cookId;
    if (status) q.status = status;

    const rows = await PrepRequest.find(q).sort({ createdAt: -1 }).lean();
    res.json(rows);
  } catch (e) {
    console.error("List prep requests error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/prep-requests/:id
 * body: { status?, quantityToPrepare? }
 * roles: cook can update own cards; supervisor/superadmin can also adjust
 */
router.patch("/:id", async (req, res) => {
  try {
    const { status, quantityToPrepare } = req.body || {};
    const update = {};

    if (status && ["queued", "processing", "ready", "picked"].includes(status)) {
      update.status = status;
    }
    if (typeof quantityToPrepare === "number") {
      update.quantityToPrepare = quantityToPrepare;
    }

    const doc = await PrepRequest.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    res.json(doc);
  } catch (e) {
    console.error("Update prep request error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
