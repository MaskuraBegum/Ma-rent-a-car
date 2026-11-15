import { z } from "zod";
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES } from "../models/MaintenanceLog.js";

const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

export const maintenanceSchema = z.object({
  car: z.string().regex(/^[a-f\d]{24}$/i, "Choose a vehicle"),
  type: z.enum(Object.keys(MAINTENANCE_TYPES)),
  date: dhakaDate,
  odometer: z.number().int().min(0).nullable().optional(), // null clears it
  status: z.enum(Object.keys(MAINTENANCE_STATUSES)),
  tripNo: z.number().int().min(1).nullable().optional(), // the trip number; null clears it
  parts: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Part name is required").max(150),
        quantity: z.number().positive().optional(),
        unitCost: z.number().min(0).optional(),
      })
    )
    .max(50)
    .optional(),
  supplierBill: z.string().regex(/^[a-f\d]{24}$/i, "Invalid bill").nullable().optional(), // a vendor bill; null clears it
  description: z.string().trim().max(1000).optional(),
  workshop: z.string().trim().max(150).optional(),
  cost: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
