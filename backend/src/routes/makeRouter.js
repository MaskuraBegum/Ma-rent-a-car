import { Router } from "express";
import { validate } from "../middleware/validate.js";

export const makeRouter = (ctrl, schema, { upload = [] } = {}) => {
  const r = Router();
  r.get("/", ctrl.list);
  r.post("/", ...upload, validate(schema), ctrl.create);
  r.get("/:id", ctrl.get);
  r.patch("/:id", ...upload, validate(schema.partial()), ctrl.update);
  r.delete("/:id", ctrl.deactivate);
  return r;
};