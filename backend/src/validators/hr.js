import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");
const money = z.number().min(0);
const who = { employeeModel: z.enum(["Staff", "Driver"]), employee: objectId };
const text = (n) => z.string().trim().max(n).optional();

export const settingsSchema = z.object({
  weeklyHolidays: z.array(z.number().int().min(0).max(6)).max(7),
  holidayAttendance: z.enum(["not_paid", "extra_paid"]),
  perDayBasis: z.enum(["working_days", "calendar_days", "fixed_30"]),
  halfDayValue: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  payLeaveDays: z.boolean(),
  payHolidays: z.boolean(),
  capAtBase: z.boolean(),
  deductAdvance: z.boolean(),
});

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  maxDaysPerYear: z.number().int().min(0).max(366),
  isPaid: z.boolean(),
  isActive: z.boolean().optional(),
});
export const leaveTypeUpdateSchema = leaveTypeSchema.partial();

export const leaveSchema = z
  .object({ ...who, leaveType: objectId, from: dhakaDate, to: dhakaDate, reason: text(300) })
  .refine((v) => v.to >= v.from, { message: "End date is before the start date", path: ["to"] });
export const statusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });

export const structureSchema = z.object({
  designation: z.string().trim().min(2).max(60),
  baseSalary: money,
  perTripIncentive: money.optional(),
  foodAllowance: money.optional(),
  travelAllowance: money.optional(),
  otherAllowance: money.optional(),
  effectiveFrom: dhakaDate,
  note: text(300),
  isActive: z.boolean().optional(),
});
export const structureUpdateSchema = structureSchema.partial();

export const advanceSchema = z
  .object({ ...who, date: dhakaDate, amount: z.number().min(1), monthlyDeduction: money.optional(), reason: text(300) })
  .refine((v) => (v.monthlyDeduction ?? 0) <= v.amount, { message: "Monthly deduction is more than the advance", path: ["monthlyDeduction"] });
export const advanceUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  monthlyDeduction: money.optional(),
  reason: text(300),
});

export const fineSchema = z.object({ ...who, date: dhakaDate, amount: z.number().min(1), reason: z.string().trim().min(2).max(300), note: text(300) });
export const fineUpdateSchema = z.object({ status: z.enum(["pending", "waived"]) });

export const attendanceBulkSchema = z.object({
  date: dhakaDate,
  entries: z
    .array(z.object({ ...who, status: z.enum(["P", "A", "L", "HD", "H", ""]).nullable().optional(), note: text(200) }))
    .max(500),
});

export const generateSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM") });
export const payStatusSchema = z.object({
  status: z.enum(["approved", "paid"]),
  account: objectId.optional(),
  paidDate: dhakaDate.optional(),
});