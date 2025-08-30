import mongoose from "mongoose";

const RawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number },            
    unit: { type: String, trim: true } 
  },
  { _id: false }
);

const QuantitySchema = new mongoose.Schema(
  {
    amount: {type: Number, min: 0},
    unit: { type: String, trim: true}
  },
  {_id: false}
)

const FoodItemSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    price:     { type: Number, required: true, min: 0 },
    category:  { type: String, required: true, trim: true },
    available: { type: Boolean, default: true },
    tax:       { type: Number, default: 0, min: 0 },


    imageUrl:  { type: String, default: null },
    imagePath: { type: String, default: null },
    rawMaterials: {type: [RawMaterialSchema], default: []},
    totalQuantity: { type: QuantitySchema, default: undefined },
perServing:    { type: QuantitySchema, default: undefined },

  },
  { timestamps: true }
);

export const FoodItem = mongoose.model("FoodItem", FoodItemSchema);
export default FoodItem;
