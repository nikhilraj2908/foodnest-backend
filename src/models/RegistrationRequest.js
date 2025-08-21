import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./User.js";

const roles = ["rider", "cook", "supervisor", "refill"]; // users can request only these

const RegistrationRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: roles, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// Set password (hashing)
RegistrationRequestSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

// Approve -> create user with same creds, then delete request
RegistrationRequestSchema.methods.approve = async function () {
  const user = new User({
    email: this.email,
    name: this.name,
    role: this.role,
    passwordHash: this.passwordHash, // already hashed
  });
  await user.save();
  await this.deleteOne();
  return user;
};

export const RegistrationRequest = mongoose.model("RegistrationRequest", RegistrationRequestSchema);
