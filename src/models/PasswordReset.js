// src/models/PasswordReset.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const PasswordResetSchema = new Schema(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    code: { type: String, required: true },     
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },       
    consumed: { type: Boolean, default: false },  
  },
  { timestamps: true }
);

// Single active code per email at a time
PasswordResetSchema.index({ email: 1, consumed: 1 }, { unique: false });

export const PasswordReset = mongoose.model("PasswordReset", PasswordResetSchema);
export default PasswordReset;
