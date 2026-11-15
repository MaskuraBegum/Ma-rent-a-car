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
  trip: objectId.optional(),
});

export const invoiceSchema = z.object({
  type: z.enum(["client", "vendor"]),
  party: objectId, // the client, or the vendor
  unitId: objectId.optional(),
  status: z.enum(["draft", "sent", "unpaid", "partial", "paid", "overdue"]).optional(),
  // used with status Partial or Paid: the money already received (Paid = the whole total)
  received: z
    .object({
      amount: z.number().positive("Amount must be more than zero").optional(),
      date: dhakaDate.optional(),
      method: z.enum(["cash", "bank", "bkash", "nagad", "other"]).optional(),
    })
    .optional(),
  invoiceNo: z.string().trim().max(40).optional(),
  poNo: z.string().trim().max(60).optional(),
  invoiceDate: dhakaDate,
  dueDate: dhakaDate,
  items: z.array(itemSchema).min(1, "Add at least one item").max(200),
  notes: z.string().trim().max(1000).optional(),
  discount: z.number().min(0).optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  otherCharges: z.number().min(0).optional(),
});

export const invoiceUpdateSchema = invoiceSchema.omit({ type: true }).partial();

export const statusSchema = z.object({ status: z.enum(["draft", "sent", "unpaid", "overdue", "cancelled"]) });

export const paymentSchema = z.object({
  date: dhakaDate,
  amount: z.number().positive("Amount must be more than zero"),
  method: z.enum(["cash", "bank", "bkash", "nagad", "other"]).optional(),
  note: z.string().trim().max(300).optional(),
});
