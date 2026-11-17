import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(150),
  description: z.string().trim().max(500).optional(),
  quantity: z.number().positive("Quantity must be more than zero"),
  rate: z.number().min(0),
  discount: z.number().min(0).optional(),
  vatPercent: z.number().min(0).max(100).optional(),
});

export const purchaseSchema = z.object({
  vendor: objectId,
  status: z.enum(["draft", "unpaid"]).optional(),
  purchaseNo: z.string().trim().max(40).optional(),
  refNo: z.string().trim().max(60).optional(),
  date: dhakaDate,
  dueDate: dhakaDate,
  items: z.array(itemSchema).min(1, "Add at least one item").max(200),
  notes: z.string().trim().max(1000).optional(),
  footer: z.string().trim().max(500).optional(),
  discount: z.number().min(0).optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  otherCharges: z.number().min(0).optional(),
});

export const purchaseUpdateSchema = purchaseSchema.partial();

export const purchaseStatusSchema = z.object({ status: z.enum(["draft", "unpaid", "cancelled"]) });