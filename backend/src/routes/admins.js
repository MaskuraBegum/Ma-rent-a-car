import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { create, list, resetPassword, setActive } from "../controllers/adminController.js";

const password = z.string().min(8, "Use at least 8 characters").max(200);
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password,
});

const r = Router();
r.get("/", list);
r.post("/", validate(createSchema), create);
r.patch("/:id/active", validate(z.object({ isActive: z.boolean() })), setActive);
r.post("/:id/password", validate(z.object({ password })), resetPassword);

export default r;