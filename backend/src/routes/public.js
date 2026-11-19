import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { bookingSchema } from "../validators/trip.js";
import { createBooking, tripCard } from "../controllers/publicController.js";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // 5 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// the customer's page: generous for real use, tight enough to stop guessing
const cardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

const r = Router();
r.post("/booking", limiter, validate(bookingSchema), createBooking);
r.get("/trip/:token", cardLimiter, tripCard);

export default r;