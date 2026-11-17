import mongoose from "mongoose";

export const STAFF_ROLES = ["Manager", "Accountant", "Office staff", "Helper", "Mechanic", "Other"];

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, enum: STAFF_ROLES, default: "Office staff" },
    phone: { type: String, required: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    nidNo: { type: String, trim: true },
    joiningDate: { type: Date },
    salary: { type: Number, min: 0, default: 0 }, // monthly, taka
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);