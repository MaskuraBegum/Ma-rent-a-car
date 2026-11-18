import { z } from "zod";
import { ASSET_SUBGROUPS, HEAD_GROUPS } from "../models/LedgerHead.js";

export const headSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    group: z.enum(HEAD_GROUPS),
    subGroup: z.enum(ASSET_SUBGROUPS).optional(),
    note: z.string().trim().max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => (v.group === "assets" ? !!v.subGroup : !v.subGroup), {
    message: "Choose a sub-section for assets only",
    path: ["subGroup"],
  });

export const headUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  note: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
});