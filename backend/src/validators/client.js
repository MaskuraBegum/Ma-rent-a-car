import { z } from "zod";
import { phone } from "./common.js";

const unitSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i).optional(), // keep this when editing an existing unit
  name: z.string().trim().min(1).max(100),
  contactName: z.string().trim().max(100).optional(),
  phone,
  address: z.string().trim().max(300).optional(),
});

export const clientSchema = z.object({
type: z.enum([ "office", "corporate"]),
name: z.string().trim().min(2).max(100),
phone: phone.optional(),
contactName: z.string().trim().max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  address: z.string().trim().max(300).optional(),
  units: z.array(unitSchema).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});