import { z } from "zod";

const thisYear = new Date().getFullYear();

export const carSchema = z.object({
  companyName: z.string().trim().min(2).max(50),            // e.g. Toyota
  model: z.string().trim().min(1).max(50),                  // e.g. Noah
  year: z.number().int().min(1980).max(thisYear + 1),       // market production year
  seatCapacity: z.number().int().min(1).max(60),
  ac: z.boolean(),
  soundSystem: z.boolean(),
  fuelTypes: z.array(z.enum(["octane", "cng", "lpg"])).min(1),
  registrationNo: z.string().trim().max(30).optional(),
  vendor: z.string().regex(/^[a-f\d]{24}$/i, "Invalid vendor id").nullable().optional(),
  isActive: z.boolean().optional(),
});