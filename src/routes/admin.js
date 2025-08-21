import express from "express";
import { auth, requireRole } from "../middleware/auth.js";
import { RegistrationRequest } from "../models/RegistrationRequest.js";

const router = express.Router();

/** GET /api/admin/requests */
router.get("/requests", auth, requireRole("superadmin"), async (req, res) => {
  const items = await RegistrationRequest.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

/** POST /api/admin/requests/:id/approve */
router.post("/requests/:id/approve", auth, requireRole("superadmin"), async (req, res) => {
  const doc = await RegistrationRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  // will create a User and delete the request
  const user = await doc.approve();
  res.json({ ok: true, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

/** POST /api/admin/requests/:id/decline */
router.post("/requests/:id/decline", auth, requireRole("superadmin"), async (req, res) => {
  const doc = await RegistrationRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  await doc.deleteOne();
  res.json({ ok: true });
});

export default router;
