import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { headSchema, headUpdateSchema } from "../validators/chart.js";
import * as c from "../controllers/chartController.js";

const r = Router();
r.get("/", c.chart);
r.post("/heads", validate(headSchema), c.createHead);
r.patch("/heads/:id", validate(headUpdateSchema), c.updateHead);
r.delete("/heads/:id", c.deleteHead);

export default r;