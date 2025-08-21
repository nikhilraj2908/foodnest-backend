import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const roles = ["superadmin", "rider", "cook", "supervisor", "refill"];

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: roles, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// Helper to set password
UserSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

// Helper to verify password
UserSchema.methods.verifyPassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model("User", UserSchema);
export const ROLE_ENUM = roles;
