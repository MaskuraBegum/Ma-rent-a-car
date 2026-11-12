import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { bookingSchema } from "../validators/trip.js";
import { createBooking } from "../controllers/publicController.js";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // 5 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

const r = Router();
r.post("/booking", limiter, validate(bookingSchema), createBooking);

export default r;