import { Router } from "express";
import { validate } from "../middleware/validate.js";
import * as v from "../validators/hr.js";
import * as c from "../controllers/hrController.js";

const r = Router();
const crud = (path, ctrl, create, update) => {
  r.get(path, ctrl.list);
  if (create) r.post(path, validate(create), ctrl.create);
  if (update) r.patch(`${path}/:id`, validate(update), ctrl.update);
  r.delete(`${path}/:id`, ctrl.remove);
};

r.get("/employees", c.listEmployees);
r.get("/designations", c.designations);
r.get("/settings", c.readSettings);
r.patch("/settings", validate(v.settingsSchema), c.saveSettings);

crud("/leave-types", c.leaveTypes, v.leaveTypeSchema, v.leaveTypeUpdateSchema);
crud("/leaves", c.leaves, v.leaveSchema, v.statusSchema);
crud("/structures", c.structures, v.structureSchema, v.structureUpdateSchema);
crud("/advances", c.advances, v.advanceSchema, v.advanceUpdateSchema);
crud("/fines", c.fines, v.fineSchema, v.fineUpdateSchema);

r.get("/attendance", c.dayAttendance);
r.get("/attendance/month", c.monthAttendance);
r.post("/attendance/bulk", validate(v.attendanceBulkSchema), c.saveAttendance);

r.get("/payroll", c.listPayroll);
r.post("/payroll/generate", validate(v.generateSchema), c.generatePayroll);
r.post("/payroll/:id/status", validate(v.payStatusSchema), c.payrollStatus);
r.delete("/payroll/:id", c.deletePayroll);

export default r;