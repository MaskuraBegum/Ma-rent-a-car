import mongoose from "mongoose";

const ref = (name) => ({ type: mongoose.Schema.Types.ObjectId, ref: name, default: null });

// draft: not issued yet. sent / unpaid / partial / overdue: issued and still owed (receivable for a client invoice, payable for a vendor bill).
// paid: nothing left to pay. cancelled: void.
export const INVOICE_STATUSES = ["draft", "sent", "unpaid", "partial", "paid", "overdue", "cancelled"];
export const ISSUED_STATUSES = ["sent", "unpaid", "partial", "paid", "overdue"];
export const PAYMENT_METHODS = ["cash", "bank", "bkash", "nagad", "other"];

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  vatPercent: { type: Number, default: 0, min: 0, max: 100 },
  lineTotal: { type: Number, default: 0 },
  trip: ref("Trip"), // set when the line came from a completed trip
});

const paymentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: PAYMENT_METHODS, default: "cash" },
  note: { type: String, trim: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["client", "vendor"], required: true, index: true }, // client invoice or vendor bill
    client: ref("Client"),
    vendor: ref("Vendor"),
    unitId: mongoose.Schema.Types.ObjectId,
    // copied when saved, so an old invoice keeps its name and address even if the record changes later
    billTo: { name: String, address: String, phone: String, unitName: String },

    status: { type: String, enum: INVOICE_STATUSES, default: "draft", index: true },
    invoiceNo: { type: String, required: true, trim: true },
    poNo: { type: String, trim: true },
    invoiceDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true },

    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    notes: { type: String, trim: true },
    discount: { type: Number, default: 0, min: 0 },
    vatPercent: { type: Number, default: 0, min: 0, max: 100 },
    otherCharges: { type: Number, default: 0, min: 0 },

    subTotal: Number,
    vatAmount: Number,
    grandTotal: Number,

    payments: [paymentSchema],
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },

    tripIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
  },
  { timestamps: true }
);

invoiceSchema.index({ type: 1, invoiceNo: 1 }, { unique: true });

export default mongoose.model("Invoice", invoiceSchema);
