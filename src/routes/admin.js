// src/routes/admin.js
import express from "express";
import { auth, requireRole } from "../middleware/auth.js";
import { RegistrationRequest } from "../models/RegistrationRequest.js";
import User from "../models/User.js"; // default export in your project
import { encryptJson, decryptJson, maskAccountNumber } from "../utils/crypto.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Normalize incoming fields (accept case/hyphen variants)
function normalizeUserPayload(input = {}) {
  const out = { ...input };

  // currency to uppercase among allowed
  if (out.currency != null) {
    const c = String(out.currency).toUpperCase();
    const allowed = new Set(["THB", "INR", "USD"]);
    out.currency = allowed.has(c) ? c : undefined;
  }

  // payFrequency mapping
  if (out.payFrequency != null) {
    const pf = String(out.payFrequency).toLowerCase();
    const map = {
      monthly: "Monthly",
      week: "Weekly",
      weekly: "Weekly",
      day: "Daily",
      daily: "Daily",
      hour: "Hourly",
      hourly: "Hourly",
    };
    out.payFrequency = map[pf] || undefined;
  }

  // employmentType mapping
  if (out.employmentType != null) {
    const et = String(out.employmentType).toLowerCase().replace(/\s+/g, " ");
    const map = {
      "full-time": "Full-time",
      "full time": "Full-time",
      "fulltime": "Full-time",
      "part-time": "Part-time",
      "part time": "Part-time",
      "parttime": "Part-time",
      contract: "Contract",
      gig: "Gig / On-demand",
      "on-demand": "Gig / On-demand",
      "gig / on-demand": "Gig / On-demand",
      "gig/on-demand": "Gig / On-demand",
    };
    out.employmentType = map[et] || undefined;
  }

  // numeric fields may arrive as strings
  const toNum = (v) => (v === "" || v == null ? undefined : Number(v));
  if ("baseSalary" in out) out.baseSalary = toNum(out.baseSalary);
  if ("vat" in out) out.vat = toNum(out.vat);
  if ("otRate" in out) out.otRate = toNum(out.otRate);
  if ("allowances" in out) out.allowances = toNum(out.allowances);
  if ("deductions" in out) out.deductions = toNum(out.deductions);

  // effectiveFrom to Date
  if (out.effectiveFrom != null) {
    const d = new Date(out.effectiveFrom);
    out.effectiveFrom = isNaN(d.getTime()) ? undefined : d;
  }

  // empty strings to undefined for text fields
  ["taxId", "notes"].forEach((k) => {
    if (k in out) {
      const t = (out[k] ?? "").toString().trim();
      out[k] = t === "" ? undefined : t;
    }
  });

  // bank object cleanup
  if (out.bank) {
    const b = out.bank || {};
    const clean = {
      holder: b.holder?.toString().trim() || undefined,
      account: b.account?.toString().trim() || undefined,
      bankName: b.bankName?.toString().trim() || undefined,
      ifsc: b.ifsc?.toString().trim() || undefined,
    };
    if (!clean.holder && !clean.account && !clean.bankName && !clean.ifsc) {
      out.bank = undefined;
    } else {
      out.bank = clean;
    }
  }

  return out;
}

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

/** GET /api/admin/users/:id — get full user details */
router.get("/users/:id", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id, { passwordHash: 0 }).lean();
    if (!user) return res.status(404).json({ error: "Not found" });
    const bank = decryptJson(user.bankEnc);
    res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user?.disabled ? "Inactive" : "Active",
      currency: user.currency,
      baseSalary: user.baseSalary,
      payFrequency: user.payFrequency,
      employmentType: user.employmentType,
      vat: user.vat,
      effectiveFrom: user.effectiveFrom,
      otEligible: user.otEligible,
      otRate: user.otRate,
      allowances: user.allowances,
      deductions: user.deductions,
      taxId: user.taxId,
      bank,
      notes: user.notes,
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** PATCH /api/admin/users/:id — update basic fields and payroll */
router.patch("/users/:id", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const ALLOW = [
      "name",
      "email",
      "role",
      "disabled",
      // payroll/salary fields
      "currency",
      "baseSalary",
      "payFrequency",
      "employmentType",
      "vat",
      "effectiveFrom",
      "otEligible",
      "otRate",
      "allowances",
      "deductions",
      "taxId",
      "bank",
      "notes",
    ];
    const updates = {};
    for (const k of ALLOW) if (k in req.body) updates[k] = req.body[k];
    const normalized = normalizeUserPayload(updates);
    // Move bank to bankEnc if present
    const { bank, ...rest } = normalized;
    if (bank) {
      rest.bankEnc = encryptJson(bank);
    }

    // Optional: very light role validation
    const ROLES = new Set(["superadmin", "rider", "cook", "supervisor", "refill"]);
    if ("role" in updates && !ROLES.has(updates.role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      rest,
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
        // echo payroll fields back
        currency: user.currency,
        baseSalary: user.baseSalary,
        payFrequency: user.payFrequency,
        employmentType: user.employmentType,
        vat: user.vat,
        effectiveFrom: user.effectiveFrom,
        otEligible: user.otEligible,
        otRate: user.otRate,
        allowances: user.allowances,
        deductions: user.deductions,
        taxId: user.taxId,
        bank: decryptJson(user.bankEnc),
        notes: user.notes,
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
    const {
      name,
      email,
      role,
      password,
      currency,
      baseSalary,
      payFrequency,
      employmentType,
      vat,
      effectiveFrom,
      otEligible,
      otRate,
      allowances,
      deductions,
      taxId,
      bank,
      notes,
    } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: "name, email, role, password required" });
    }

    const ROLES = new Set(["superadmin", "rider", "cook", "supervisor", "refill"]);
    if (!ROLES.has(role)) return res.status(400).json({ error: "Invalid role" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const payroll = normalizeUserPayload({
      currency,
      baseSalary,
      payFrequency,
      employmentType,
      vat,
      effectiveFrom,
      otEligible,
      otRate,
      allowances,
      deductions,
      taxId,
      bank,
      notes,
    });

    // Remove undefined keys to avoid overwriting defaults
    Object.keys(payroll).forEach((k) => payroll[k] === undefined && delete payroll[k]);

    const { bank: bankPlain, ...rest } = payroll;
    const user = await User.create({ name, email, role, passwordHash, ...rest, bankEnc: bankPlain ? encryptJson(bankPlain) : undefined });

    res.status(201).json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.disabled ? "Inactive" : "Active",
        currency: user.currency,
        baseSalary: user.baseSalary,
        payFrequency: user.payFrequency,
        employmentType: user.employmentType,
        vat: user.vat,
        effectiveFrom: user.effectiveFrom,
        otEligible: user.otEligible,
        otRate: user.otRate,
        allowances: user.allowances,
        deductions: user.deductions,
        taxId: user.taxId,
        bank: decryptJson(user.bankEnc),
        notes: user.notes,
      },
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
