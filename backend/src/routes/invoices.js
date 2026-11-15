import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { invoiceSchema, invoiceUpdateSchema, paymentSchema, statusSchema } from "../validators/invoice.js";
import {
  addPayment, billableTrips, createInvoice, deletePayment, getInvoice, invoicePdf, itemCatalog, listInvoices, nextNumber,
  setStatus, statement, updateInvoice,
} from "../controllers/invoiceController.js";

const r = Router();
// fixed words first, so they are not taken for an id
r.get("/items", itemCatalog);
r.get("/trips", billableTrips);
r.get("/next-number", nextNumber);
r.get("/statement", statement);

r.get("/", listInvoices);
r.post("/", validate(invoiceSchema), createInvoice);
r.get("/:id", getInvoice);
r.get("/:id/pdf", invoicePdf);
r.patch("/:id", validate(invoiceUpdateSchema), updateInvoice);
r.post("/:id/status", validate(statusSchema), setStatus);
r.post("/:id/payments", validate(paymentSchema), addPayment);
r.delete("/:id/payments/:paymentId", deletePayment);

export default r;
