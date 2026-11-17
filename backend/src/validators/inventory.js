import { z } from "zod";
import { ASSET_ACCOUNTS } from "../models/InventoryItem.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  isActive: z.boolean().optional(),
});

export const unitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  shortName: z.string().trim().min(1, "Short form is required").max(12),
  isActive: z.boolean().optional(),
});

export const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(150),
  sku: z.string().trim().max(60).optional(),
  category: objectId,
  unit: objectId,
  currentStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  assetAccount: z.enum(ASSET_ACCOUNTS),
  note: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const categoryUpdateSchema = categorySchema.partial();
export const unitUpdateSchema = unitSchema.partial();
export const itemUpdateSchema = itemSchema.partial();