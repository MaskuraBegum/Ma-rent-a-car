import mongoose from "mongoose";

export const ASSET_ACCOUNTS = ["Parts in stock", "Tyres in stock", "Fuel & lubricants in stock", "Other stock"];

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    sku: { type: String, trim: true, maxlength: 60 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryCategory", required: true, index: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryUnit", required: true },
    currentStock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 0, min: 0 }, // alert level
    purchasePrice: { type: Number, default: 0, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    assetAccount: { type: String, enum: ASSET_ACCOUNTS, default: ASSET_ACCOUNTS[0], required: true },
    note: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
// an item code is only checked when one is given
schema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: "string", $gt: "" } }, collation: { locale: "en", strength: 2 } });

export default mongoose.model("InventoryItem", schema);