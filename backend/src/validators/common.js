import { z } from "zod";
import { normalizeBDPhone } from "../utils/phone.js";

export const phone = z.string().transform((v, ctx) => {
  const p = normalizeBDPhone(v);
  if (!p) {
    ctx.addIssue({ code: "custom", message: "Invalid Bangladesh mobile number" });
    return z.NEVER;
  }
  return p;
});