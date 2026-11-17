import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 }, // Meter
    shortName: { type: String, required: true, trim: true, maxlength: 12 }, // m
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
schema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export default mongoose.model("InventoryUnit", schema);