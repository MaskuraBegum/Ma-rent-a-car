import mongoose from "mongoose";

export const TX_TYPES = ["in", "out", "transfer"];
export const IN_SOURCES = ["Client", "Owner Investment", "Loan", "Other"];
export const OUT_CATEGORIES = ["Supplier payment", "Salary", "Fuel", "Office", "Owner withdrawal", "Other"];
export const PAY_METHODS = ["cash", "bank_transfer", "cheque", "bkash", "nagad", "card", "other"];

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TX_TYPES, required: true, index: true },
    date: { type: Date, required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true }, // in: deposit to, out: paid from, transfer: from
    toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account" }, // transfer only
    source: { type: String, trim: true }, // in: where the money came from
    category: { type: String, trim: true }, // out: what it was for
    payee: { type: String, trim: true }, // out: who was paid
    amount: { type: Number, required: true, min: 0.01 },
    voucherNo: { type: String, trim: true },
    method: { type: String, enum: PAY_METHODS },
    transactionId: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);