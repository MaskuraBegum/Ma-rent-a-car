import mongoose from "mongoose";

export const ENTRY_KINDS = ["duty", "payment", "opening", "adjustment"];
const ref = (name) => ({ type: mongoose.Schema.Types.ObjectId, ref: name, default: null });

// One line of a driver's or vendor's account.
//   delta > 0: the company owes more (a completed trip, an opening balance, a plus adjustment)
//   delta < 0: the company owes less (a payment, a minus adjustment)
// The balance is always the sum of the deltas, never a number someone types over.
const ledgerSchema = new mongoose.Schema(
  {
    party: { type: String, enum: ["driver", "vendor"], required: true, index: true },
    driver: ref("Driver"),
    vendor: ref("Vendor"),
    date: { type: Date, required: true, index: true },
    kind: { type: String, enum: ENTRY_KINDS, required: true },
    delta: { type: Number, required: true },
    method: { type: String, enum: ["cash", "bank", "bkash", "nagad", "other"] },
    note: { type: String, trim: true },
    trip: ref("Trip"), // set on the entries that come from a completed trip
  },
  { timestamps: true }
);

ledgerSchema.pre("validate", function () {
  const id = this.party === "driver" ? this.driver : this.vendor;
  if (!id) this.invalidate(this.party, `Choose the ${this.party}`);
  if (!this.delta) this.invalidate("delta", "The amount cannot be zero");
});

export default mongoose.model("LedgerEntry", ledgerSchema);