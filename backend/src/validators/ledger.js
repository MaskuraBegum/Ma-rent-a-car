import { z } from "zod";

const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

// payment: a positive amount we paid.
// opening / adjustment: positive = we owe more, negative = we owe less (or paid ahead).
export const entrySchema = z.object({
  kind: z.enum(["payment", "opening", "adjustment"]),
  date: dhakaDate,
  amount: z.number().refine((n) => n !== 0, "The amount cannot be zero"),
  method: z.enum(["cash", "bank", "bkash", "nagad", "other"]).optional(),
  note: z.string().trim().max(300).optional(),
});