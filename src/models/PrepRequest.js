// src/models/PrepRequest.js
import mongoose from "mongoose";

const RawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number },            // optional
    unit: { type: String, trim: true } // optional
  },
  { _id: false }
);

const QuantitySchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0 },
    unit: { type: String, trim: true }
  },
  { _id: false }
);

const PrepRequestSchema = new mongoose.Schema(
  {
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodItem", required: true },
    

    // immutable snapshot of the food card at the time of sending
    foodSnapshot: {
      name: { type: String, required: true },
      price: Number,
      category: String,
      tax: Number,
      available: Boolean,
      imageUrl: String,
      rawMaterials: { type: [RawMaterialSchema], default: [] },
      totalQuantity: { type: QuantitySchema, default: undefined },
      perServing: { type: QuantitySchema, default: undefined },
    },

    cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 

    status: { type: String, enum: ["queued", "processing", "ready", "picked"], default: "queued" },
    quantityToPrepare: { type: Number, default: 0 },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

PrepRequestSchema.index({ cookId: 1, status: 1, createdAt: -1 });
PrepRequestSchema.index({ requestedBy: 1, createdAt: -1 });


export const PrepRequest = mongoose.model("PrepRequest", PrepRequestSchema);
export default PrepRequest;
