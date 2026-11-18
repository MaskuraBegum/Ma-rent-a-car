import mongoose from "mongoose";

export const HEAD_GROUPS = ["assets", "liabilities", "income", "expenses", "equity"];
// only assets use sub-sections; bank, cash and credit cards come from the Accounts records
export const ASSET_SUBGROUPS = ["Money in Transit", "Property, Plant & Equipment", "Other Short-Term Assets"];

const ledgerHeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: HEAD_GROUPS, required: true },
    subGroup: { type: String, enum: [...ASSET_SUBGROUPS, ""], default: "" },
    note: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
ledgerHeadSchema.index({ group: 1, subGroup: 1, name: 1 }, { unique: true });

export default mongoose.model("LedgerHead", ledgerHeadSchema);