import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { accountSchema, accountUpdateSchema, transactionSchema, transactionUpdateSchema } from "../validators/transaction.js";
import * as c from "../controllers/transactionController.js";

const r = Router();
r.get("/options", c.options);

r.get("/accounts", c.listAccounts);
r.post("/accounts", validate(accountSchema), c.createAccount);
r.patch("/accounts/:id", validate(accountUpdateSchema), c.updateAccount);
r.delete("/accounts/:id", c.deleteAccount);

r.get("/", c.list);
r.post("/", validate(transactionSchema), c.create);
r.patch("/:id", validate(transactionUpdateSchema), c.update);
r.delete("/:id", c.remove);

export default r;