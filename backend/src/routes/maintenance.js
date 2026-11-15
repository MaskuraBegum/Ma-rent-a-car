import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { maintenanceSchema } from "../validators/maintenance.js";
import { createLog, deactivateLog, getLog, listLogs, updateLog } from "../controllers/maintenanceController.js";

const r = Router();
r.get("/", listLogs);
r.post("/", validate(maintenanceSchema), createLog);
r.get("/:id", getLog);
r.patch("/:id", validate(maintenanceSchema.partial()), updateLog);
r.delete("/:id", deactivateLog);

export default r;
