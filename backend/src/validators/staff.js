import { z } from "zod";
import { phone } from "./common.js";
import { STAFF_ROLES } from "../models/Staff.js";

const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  designation: z.enum(STAFF_ROLES).optional(),
  phone,
  email: z.string().trim().toLowerCase().email().optional(),
  nidNo: z.string().trim().regex(/^(\d{10}|\d{13}|\d{17})$/, "NID must be 10, 13 or 17 digits").optional(),
  joiningDate: dhakaDate.optional(),
  salary: z.number().min(0).optional(),
  address: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional(),
});