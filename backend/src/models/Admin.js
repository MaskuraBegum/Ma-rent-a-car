import mongoose from "mongoose";

// Only admins exist for now. There is no sign-up: an admin is created with scripts/create-admin.mjs
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    tokenVersion: { type: Number, default: 0 }, // raised on a password change: every older login stops working
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);