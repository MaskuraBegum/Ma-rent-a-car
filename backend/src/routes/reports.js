import { Router } from "express";
import { generate } from "../controllers/reportController.js";

const r = Router();
r.get("/:section/:type", generate);

export default r;
