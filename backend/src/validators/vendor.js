import { z } from "zod";
import { phone } from "./common.js";

export const vendorSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone,
  companyName: z.string().trim().max(100).optional(),
  image: z.string().nullable().optional(), // null = the image was removed
  isActive: z.boolean().optional(),
});