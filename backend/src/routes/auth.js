
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/auth.js";
import { changePassword, login, logout, me } from "../controllers/authController.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // 10 wrong tries per IP per 15 minutes
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." },
});

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "Use at least 8 characters").max(200),
});

const r = Router();
r.post("/login", loginLimiter, validate(loginSchema), login);
r.post("/logout", logout);
r.get("/me", requireAdmin, me);
r.post("/change-password", requireAdmin, validate(passwordSchema), changePassword);

export default r;
