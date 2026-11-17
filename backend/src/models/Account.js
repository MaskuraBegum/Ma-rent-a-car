import mongoose from "mongoose";

export const ACCOUNT_TYPES = ["cash", "bank", "mobile", "card"];

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ACCOUNT_TYPES, default: "cash" },
    accountNo: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Account", accountSchema);