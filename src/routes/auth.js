import express from "express";
import { User } from "../models/User.js";
import { RegistrationRequest } from "../models/RegistrationRequest.js";
import { signToken } from "../utils/jwt.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/** POST /api/auth/login {email,password} */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await user.verifyPassword(password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

/** POST /api/auth/register-request {email,name,role,password} */
router.post("/register-request", async (req, res) => {
  const { email, name, role, password } = req.body || {};
  if (!email || !name || !role || !password) return res.status(400).json({ error: "Missing fields" });

  const allowed = ["rider", "cook", "supervisor", "refill"];
  if (!allowed.includes(role)) return res.status(400).json({ error: "Invalid role" });

  const e = String(email).trim().toLowerCase();
  const n = String(name).trim();

  if (await User.findOne({ email: e })) return res.status(409).json({ error: "Email already exists" });
  if (await RegistrationRequest.findOne({ email: e })) return res.status(409).json({ error: "Request already submitted" });

  const doc = new RegistrationRequest({ email: e, name: n, role, passwordHash: "x" });
  await doc.setPassword(password);
  await doc.save();

  res.status(201).json({ ok: true, id: doc._id });
});

/** GET /api/auth/me  (requires Bearer token) */
router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
