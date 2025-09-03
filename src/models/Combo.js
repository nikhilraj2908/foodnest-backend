// src/models/Combo.js
import mongoose from "mongoose";

const ComboSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    items:  [{ type: mongoose.Schema.Types.ObjectId, ref: "FoodItem", required: true }],
    price:  { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  { timestamps: true }
);

export const Combo = mongoose.model("Combo", ComboSchema);
export default Combo;
