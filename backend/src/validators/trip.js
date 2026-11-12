import { z } from "zod";
import { phone } from "./common.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24 hour)");
const money = z.number().int().min(0);

// "2026-11-15" -> start of that day in Dhaka time (UTC+6)
const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

export const tripCreateSchema = z.object({
  status: z.enum(["requested", "completed"]).optional(), // completed = entering an old/finished trip
  date: dhakaDate,
  startTime: hhmm.optional(),
  finishTime: hhmm.optional(),
  location: z.string().trim().min(2).max(300),
  client: objectId.optional(),
  unitId: objectId.optional(),
  passengerName: z.string().trim().max(100).optional(),
  passengerPhone: phone.optional(),
  vehicleType: z.string().trim().max(50).optional(),
  car: objectId.optional(),
  driver: objectId.optional(),
  vendor: objectId.optional(),
  driverName: z.string().trim().max(100).optional(),
  driverPhone: phone.optional(),
  totalKm: z.number().min(0).optional(),
  fuelType: z.enum(["octane", "cng", "lpg"]).optional(),
  rent: money.optional(),
  ownerAmount: money.optional(),
  others: money.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const tripUpdateSchema = tripCreateSchema.omit({ status: true }).partial();

export const assignSchema = z.object({
  driver: objectId,
  car: objectId.optional(),
  vendor: objectId.optional(),
  client: objectId.optional(),
  unitId: objectId.optional(),
  rent: money.optional(),
  ownerAmount: money.optional(),
});

export const statusSchema = z.object({
  status: z.enum(["sent", "completed", "declined", "cancelled"]),
});

// public website form
export const bookingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  whatsapp: phone,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  time: hhmm,
  location: z.string().trim().min(3).max(300),
  vehicleType: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(500).optional(),
  website: z.string().optional(), // honeypot: real people leave it empty
});