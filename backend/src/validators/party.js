import { z } from "zod";
import { normalizeBDPhone } from "../utils/phone.js";

const phone = z.string().transform((v, ctx) => {
  const p = normalizeBDPhone(v);
  if (!p) {
    ctx.addIssue({ code: "custom", message: "Invalid Bangladesh mobile number" });
    return z.NEVER;
  }
  return p;
});

const base = {
  name: z.string().trim().min(2).max(100),
  phone,
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
};

export const driverSchema = z.object({
  ...base,
  licenseNo: z.string().trim().max(50).optional(),
});

export const vendorSchema = z.object({
  ...base,
  companyName: z.string().trim().max(100).optional(),
});

export const partsShopSchema = z.object(base);