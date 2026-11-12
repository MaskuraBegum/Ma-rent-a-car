import { z } from "zod";
import { phone } from "./common.js";

export const driverSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone,
  email: z.string().trim().toLowerCase().email().optional(),
  nidNo: z.string().trim().regex(/^(\d{10}|\d{13}|\d{17})$/, "NID must be 10, 13 or 17 digits"),
  licenseNo: z.string().trim().min(5).max(30),
  photo: z.string().optional(),
  isActive: z.boolean().optional(),
});