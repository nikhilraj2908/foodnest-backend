// src/routes/users.js
import express from "express";
import { User } from "../models/User.js";

const router = express.Router();

// GET /api/users?role=cook
router.get("/", async (req, res) => {
  try {
    const role = String(req.query.role || "").toLowerCase();
    const query = role ? { role } : {};
    const users = await User.find(query, "_id name email role").lean();
    res.json(users);
  } catch (e) {
    console.error("List users error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
