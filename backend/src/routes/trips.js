import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { tripCreateSchema, tripUpdateSchema, assignSchema, statusSchema } from "../validators/trip.js";
import {
  listTrips, getTrip, createTrip, updateTrip, assignTrip, changeStatus, getWhatsApp,
} from "../controllers/tripController.js";

const r = Router();
r.get("/", listTrips);
r.post("/", validate(tripCreateSchema), createTrip);
r.get("/:id", getTrip);
r.patch("/:id", validate(tripUpdateSchema), updateTrip);
r.post("/:id/assign", validate(assignSchema), assignTrip);
r.post("/:id/status", validate(statusSchema), changeStatus);
r.get("/:id/whatsapp", getWhatsApp);

export default r;