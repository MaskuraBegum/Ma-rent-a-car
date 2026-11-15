import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = {
  fuel: "Fuel",
  maintenance: "Maintenance",
  salary: "Salary",
  office: "Office",
  other: "Other",
};

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: Object.keys(EXPENSE_CATEGORIES), required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", default: null }, // empty = general expense
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
