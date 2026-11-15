import mongoose from "mongoose";
import { nextSeq } from "./Counter.js";

export const STATUSES = ["requested", "assigned", "sent", "completed", "declined", "cancelled"];

// "assigned" is only reached through the assign endpoint
export const TRANSITIONS = {
  requested: ["declined", "cancelled"],
  assigned: ["sent", "completed", "cancelled"],
  sent: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ref = (name) => ({ type: mongoose.Schema.Types.ObjectId, ref: name });
const money = { type: Number, min: 0, default: 0 };

const tripSchema = new mongoose.Schema(
  {
    tripNo: { type: Number, unique: true },
    chalanNo: { type: String, trim: true }, // optional chalan / invoice number
    source: { type: String, enum: ["manual", "website"], default: "manual" }, // where the booking came from
    status: { type: String, enum: STATUSES, default: "requested", index: true },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],

    date: { type: Date, required: true, index: true }, // pickup / start date
    dropDate: Date, // optional end date
    startTime: { type: String, match: HHMM },
    finishTime: { type: String, match: HHMM },
    totalHours: Number,
    pickupLocation: { type: String, trim: true },
    dropLocation: { type: String, trim: true },
    location: { type: String, required: true, trim: true }, // "pickup to drop", built automatically

    client: { ...ref("Client"), default: null },
    unitId: mongoose.Schema.Types.ObjectId,
    unitName: String,
    passengerName: { type: String, trim: true },
    passengerPhone: String,

    vehicleSource: { type: String, enum: ["own", "rent"], default: "own" }, // own = company car, rent = vendor's car
    vehicleType: { type: String, trim: true },
    car: { ...ref("Car"), default: null },
    driver: { ...ref("Driver"), default: null },
    vendor: { ...ref("Vendor"), default: null },
    vendorCarNo: { type: String, trim: true }, // plate number of a rented car
    driverName: String,
    driverPhone: String,

    totalKm: { type: Number, min: 0 },
    fuelType: { type: String, enum: ["octane", "cng", "lpg"] },

    rent: money,
    ownerAmount: money, // owner/vendor/driver share
    others: money,
    officeAmount: Number, // company share = rent - ownerAmount (calculated)

    notes: String,
    isPossibleDuplicate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tripSchema.methods.setStatus = function (status) {
  this.status = status;
  this.statusHistory.push({ status });
};

tripSchema.pre("validate", async function () {
  if (this.isNew && !this.tripNo) this.tripNo = await nextSeq("trip");
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status });
  }

  // location is always "pickup to drop" when those are given
  if (this.pickupLocation) {
    this.location = [this.pickupLocation, this.dropLocation].filter(Boolean).join(" to ");
  }
  if (!this.location) this.invalidate("pickupLocation", "Pickup point is required");

  if (this.dropDate && this.date && this.dropDate < this.date) {
    this.invalidate("dropDate", "Drop date cannot be before the pickup date");
  }

  if (this.startTime && this.finishTime) {
    const [sh, sm] = this.startTime.split(":").map(Number);
    const [fh, fm] = this.finishTime.split(":").map(Number);
    let mins = fh * 60 + fm - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // trip past midnight
    this.totalHours = Math.round((mins / 60) * 100) / 100;
  }

  if (this.ownerAmount > this.rent) {
    this.invalidate("ownerAmount", "Owner amount cannot be more than rent");
  }
  this.officeAmount = this.rent - this.ownerAmount;

  // once a car is promised to the customer, the vehicle must be known
  if (["assigned", "sent", "completed"].includes(this.status)) {
    if (this.vehicleSource === "rent") {
      if (!this.vendor) this.invalidate("vendor", "Choose the vendor for a rented car");
    } else if (!this.car && !this.vehicleType) {
      this.invalidate("car", "Choose the vehicle");
    }
  }

  if (this.status === "completed") {
    if (!this.client) this.invalidate("client", "Client is required for a completed trip");
    if (!this.driver && !this.driverName) this.invalidate("driverName", "Driver is required for a completed trip");
  }
});

export default mongoose.model("Trip", tripSchema);
