import mongoose from "mongoose";

const { Schema } = mongoose;
const ref = { type: Schema.Types.ObjectId, required: true, refPath: "employeeModel" };
const who = { employeeModel: { type: String, enum: ["Staff", "Driver"], required: true }, employee: ref };

export const ATT_STATUS = ["P", "A", "L", "HD", "H"]; // W (weekly holiday) is automatic

// one document: the rules payroll follows
const settingsSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    weeklyHolidays: { type: [Number], default: [5, 6] }, // 0 = Sunday ... 6 = Saturday
    holidayAttendance: { type: String, enum: ["not_paid", "extra_paid"], default: "not_paid" },
    perDayBasis: { type: String, enum: ["working_days", "calendar_days", "fixed_30"], default: "working_days" },
    halfDayValue: { type: Number, enum: [0, 0.5, 1], default: 0.5 },
    payLeaveDays: { type: Boolean, default: true },
    payHolidays: { type: Boolean, default: true },
    capAtBase: { type: Boolean, default: true },
    deductAdvance: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const HrSettings = mongoose.model("HrSettings", settingsSchema);

export const LeaveType = mongoose.model(
  "LeaveType",
  new Schema(
    {
      name: { type: String, required: true, trim: true, unique: true },
      maxDaysPerYear: { type: Number, default: 0, min: 0 }, // 0 = no limit
      isPaid: { type: Boolean, default: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  )
);

export const LeaveRequest = mongoose.model(
  "LeaveRequest",
  new Schema(
    {
      ...who,
      leaveType: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true },
      from: { type: Date, required: true, index: true },
      to: { type: Date, required: true },
      days: { type: Number, required: true },
      reason: { type: String, trim: true },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    },
    { timestamps: true }
  )
);

const attendanceSchema = new Schema(
  { ...who, date: { type: Date, required: true }, status: { type: String, enum: ATT_STATUS, required: true }, note: { type: String, trim: true } },
  { timestamps: true }
);
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
export const Attendance = mongoose.model("Attendance", attendanceSchema);

export const SalaryStructure = mongoose.model(
  "SalaryStructure",
  new Schema(
    {
      designation: { type: String, required: true, trim: true },
      baseSalary: { type: Number, required: true, min: 0 },
      perTripIncentive: { type: Number, default: 0, min: 0 },
      foodAllowance: { type: Number, default: 0, min: 0 },
      travelAllowance: { type: Number, default: 0, min: 0 },
      otherAllowance: { type: Number, default: 0, min: 0 },
      effectiveFrom: { type: Date, required: true },
      note: { type: String, trim: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  )
);

export const Advance = mongoose.model(
  "Advance",
  new Schema(
    {
      ...who,
      date: { type: Date, required: true, index: true },
      amount: { type: Number, required: true, min: 1 },
      monthlyDeduction: { type: Number, default: 0, min: 0 },
      repaid: { type: Number, default: 0, min: 0 },
      reason: { type: String, trim: true },
      status: { type: String, enum: ["pending", "approved", "rejected", "cleared"], default: "pending" },
    },
    { timestamps: true }
  )
);

export const Fine = mongoose.model(
  "Fine",
  new Schema(
    {
      ...who,
      date: { type: Date, required: true, index: true },
      amount: { type: Number, required: true, min: 1 },
      reason: { type: String, required: true, trim: true },
      note: { type: String, trim: true },
      status: { type: String, enum: ["pending", "deducted", "waived"], default: "pending" },
    },
    { timestamps: true }
  )
);

const payrollSchema = new Schema(
  {
    month: { type: String, required: true, index: true }, // YYYY-MM
    ...who,
    name: String,
    designation: String,
    daysInMonth: Number,
    workingDays: Number,
    counts: Schema.Types.Mixed, // P, A, HD, H, leave paid/unpaid, W, unmarked
    paidDays: Number,
    perDay: Number,
    base: Number,
    earnedBase: Number,
    trips: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    travel: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    gross: Number,
    advance: { type: Number, default: 0 },
    fines: { type: Number, default: 0 },
    net: Number,
    status: { type: String, enum: ["draft", "approved", "paid"], default: "draft" },
    paidDate: Date,
  },
  { timestamps: true }
);
payrollSchema.index({ month: 1, employee: 1 }, { unique: true });
export const Payroll = mongoose.model("Payroll", payrollSchema);