import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { purchaseSchema, purchaseUpdateSchema, purchaseStatusSchema } from "../validators/purchase.js";
import { paymentSchema } from "../validators/invoice.js";
import {
  addPayment, createPurchase, deletePayment, getPurchase, itemCatalog, listPurchases, nextNumber, setStatus, updatePurchase,
} from "../controllers/purchaseController.js";

const r = Router();
// fixed words first, so they are not taken for an id
r.get("/items", itemCatalog);
r.get("/next-number", nextNumber);

r.get("/", listPurchases);
r.post("/", validate(purchaseSchema), createPurchase);
r.get("/:id", getPurchase);
r.patch("/:id", validate(purchaseUpdateSchema), updatePurchase);
r.post("/:id/status", validate(purchaseStatusSchema), setStatus);
r.post("/:id/payments", validate(paymentSchema), addPayment);
r.delete("/:id/payments/:paymentId", deletePayment);

export default r;