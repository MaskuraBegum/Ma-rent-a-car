import { z } from "zod";
import { IN_SOURCES, OUT_CATEGORIES, PAY_METHODS } from "../models/Transaction.js";
import { ACCOUNT_TYPES } from "../models/Account.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(60),
  type: z.enum(ACCOUNT_TYPES).optional(),
  accountNo: z.string().trim().max(40).optional(),
  openingBalance: z.number().optional(),
  isActive: z.boolean().optional(),
});
export const accountUpdateSchema = accountSchema.partial();

const base = {
  date: dhakaDate,
  account: objectId,
  amount: z.number().positive("Amount must be more than 0"),
  voucherNo: z.string().trim().max(60).optional(),
  method: z.enum(PAY_METHODS).optional(),
  transactionId: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
};

export const transactionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("in"), source: z.enum(IN_SOURCES) }),
  z.object({
    ...base,
    type: z.literal("out"),
    category: z.enum(OUT_CATEGORIES),
    payee: z.string().trim().max(100).optional(),
  }),
  z.object({ ...base, type: z.literal("transfer"), toAccount: objectId }),
]);

export const transactionUpdateSchema = z.object({
  date: dhakaDate.optional(),
  voucherNo: z.string().trim().max(60).optional(),
  method: z.enum(PAY_METHODS).optional(),
  transactionId: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  payee: z.string().trim().max(100).optional(),
});