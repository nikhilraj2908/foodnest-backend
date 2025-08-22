// src/routes/admin.js
import express from "express";
import { auth, requireRole } from "../middleware/auth.js";
import { RegistrationRequest } from "../models/RegistrationRequest.js";
import User from "../models/User.js"; // default export in your project
import bcrypt from "bcryptjs";

const router = express.Router();

/* -------------------------------------------
   Registration Requests (you already had these)
-------------------------------------------- */

/** GET /api/admin/requests */
router.get("/requests", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const items = await RegistrationRequest.find().sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (err) {
    console.error("List requests error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** POST /api/admin/requests/:id/approve */
router.post("/requests/:id/approve", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const doc = await RegistrationRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Prefer model method if defined (hashes password, creates user, deletes request)
    if (typeof doc.approve !== "function") {
      return res.status(500).json({ error: "RegistrationRequest.approve() not implemented" });
    }
    const user = await doc.approve();

    res.json({
      ok: true,
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** POST /api/admin/requests/:id/decline */
router.post("/requests/:id/decline", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const doc = await RegistrationRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error("Decline request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------
   Users (for SuperAdmin screens)
------------------------------ */

/** GET /api/admin/users  — list all users (superadmin only) */
router.get("/users", auth, requireRole("superadmin"), async (_req, res) => {
  try {
    // Exclude passwordHash if present
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();

    const items = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,                                // "superadmin" | "rider" | "cook" | "supervisor" | "refill"
      status: u?.disabled ? "Inactive" : "Active", // if you don't use `disabled`, this will resolve to Active
      createdAt: u.createdAt,
    }));

    res.json({ items });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** PATCH /api/admin/users/:id — update basic fields */
router.patch("/users/:id", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const ALLOW = ["name", "email", "role", "disabled"];
    const updates = {};
    for (const k of ALLOW) if (k in req.body) updates[k] = req.body[k];

    // Optional: very light role validation
    const ROLES = new Set(["superadmin", "rider", "cook", "supervisor", "refill"]);
    if ("role" in updates && !ROLES.has(updates.role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true, projection: { passwordHash: 0 } }
    ).lean();

    if (!user) return res.status(404).json({ error: "Not found" });

    res.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user?.disabled ? "Inactive" : "Active",
      },
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** DELETE /api/admin/users/:id — remove a user (but not superadmin) */
router.delete("/users/:id", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });

    if (user.role === "superadmin") {
      return res.status(400).json({ error: "Cannot delete superadmin" });
    }

    await user.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.post("/users", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: "name, email, role, password required" });
    }

    const ROLES = new Set(["superadmin", "rider", "cook", "supervisor", "refill"]);
    if (!ROLES.has(role)) return res.status(400).json({ error: "Invalid role" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, role, passwordHash });

    res.status(201).json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.disabled ? "Inactive" : "Active",
      },
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
