import { z } from "zod";
import { EXPENSE_CATEGORIES } from "../models/Expense.js";

const dhakaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00+06:00`))
  .refine((d) => !isNaN(d), "Invalid date");

export const expenseSchema = z.object({
  date: dhakaDate,
  category: z.enum(Object.keys(EXPENSE_CATEGORIES)),
  car: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id").nullable().optional(),
  amount: z.number().int().min(1),
  description: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional(),
});
