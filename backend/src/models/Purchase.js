import mongoose from "mongoose";

// draft: not final yet. unpaid / partial / paid: confirmed, the payments decide partial and paid. cancelled: void.
export const PURCHASE_STATUSES = ["draft", "unpaid", "partial", "paid", "cancelled"];
export const PAYMENT_METHODS = ["cash", "bank", "bkash", "nagad", "other"];

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  vatPercent: { type: Number, default: 0, min: 0, max: 100 },
  lineTotal: { type: Number, default: 0 },
});

const paymentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: PAYMENT_METHODS, default: "cash" },
  note: { type: String, trim: true },
});

const purchaseSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    status: { type: String, enum: PURCHASE_STATUSES, default: "draft", index: true },
    purchaseNo: { type: String, required: true, trim: true, unique: true }, // PUR-2026-0001
    refNo: { type: String, trim: true }, // the supplier's own reference
    date: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true },

    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    notes: { type: String, trim: true },
    footer: { type: String, trim: true },
    discount: { type: Number, default: 0, min: 0 },
    vatPercent: { type: Number, default: 0, min: 0, max: 100 },
    otherCharges: { type: Number, default: 0, min: 0 },

    subTotal: Number,
    vatAmount: Number,
    grandTotal: Number,

    payments: [paymentSchema],
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Purchase", purchaseSchema);