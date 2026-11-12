import mongoose from "mongoose";

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },     // e.g. "Gulshan Branch"
  contactName: { type: String, trim: true },            // office: the person who books
  phone: { type: String, required: true },                // WhatsApp number for this unit
  address: { type: String, trim: true },
});

const clientSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["individual", "office", "corporate"], required: true },
    name: { type: String, required: true, trim: true },   // person or company name
    phone: { type: String, unique: true, sparse: true },  // individuals (repeat customers)
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },                // billing address for invoices
    units: [unitSchema],                                  // corporate only
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Rules checked on create
clientSchema.pre("validate", function () {
    if (["individual", "office"].includes(this.type) && !this.phone) {
      this.invalidate("phone", "Phone is required for this client");
    }
    if (this.type === "corporate" && this.units.length === 0) {
      this.invalidate("units", "Add at least one unit for a corporate client");
    }
  });

export default mongoose.model("Client", clientSchema);