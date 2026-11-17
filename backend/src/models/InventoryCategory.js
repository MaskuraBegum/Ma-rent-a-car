import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
schema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } }); // "Filter" and "filter" are the same

export default mongoose.model("InventoryCategory", schema);