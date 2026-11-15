import mongoose from "mongoose";

export const MAINTENANCE_TYPES = {
  breakdown: "Breakdown",
  service: "Regular service",
  oil_change: "Oil change",
  tire: "Tire",
  repair: "Repair",
  inspection: "Inspection",
  accident: "Accident",
  other: "Other",
};
export const MAINTENANCE_STATUSES = { pending: "Pending", in_progress: "In progress", completed: "Completed" };

const partSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1, min: 0 },
  unitCost: { type: Number, default: 0, min: 0 },
});

const maintenanceSchema = new mongoose.Schema(
  {
    refNo: { type: String, unique: true, sparse: true }, // MNT-2026-0001, given automatically
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true, index: true },
    type: { type: String, enum: Object.keys(MAINTENANCE_TYPES), required: true },
    date: { type: Date, required: true, index: true },
    odometer: { type: Number, min: 0, default: null }, // km, optional
    status: { type: String, enum: Object.keys(MAINTENANCE_STATUSES), required: true, default: "completed" },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null }, // the trip it happened on, optional
    parts: [partSchema], // parts used
    supplierBill: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null }, // the vendor bill for the parts or work
    description: { type: String, trim: true },
    workshop: { type: String, trim: true }, // workshop or mechanic, optional
    cost: { type: Number, min: 0, default: 0 },
    // the cost is kept as one Expense (category Maintenance), so the expense and maintenance reports see it
    expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("MaintenanceLog", maintenanceSchema);
