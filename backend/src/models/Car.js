import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    seatCapacity: { type: Number, required: true },
    ac: { type: Boolean, required: true },
    soundSystem: { type: Boolean, required: true },
    fuelTypes: {
      type: [String],
      enum: ["octane", "cng", "lpg"],
      required: true,
    },
    registrationNo: { type: String, trim: true, unique: true, sparse: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null }, // null = company car
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Car", carSchema);