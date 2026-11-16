import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { entrySchema } from "../validators/ledger.js";
import { addEntry, balances, deleteEntry, partyLedger } from "../controllers/ledgerController.js";

const r = Router();
r.get("/balances/:type", balances); // before /:type/:id, so "balances" is not taken for a type
r.delete("/entries/:entryId", deleteEntry);
r.get("/:type/:id", partyLedger);
r.post("/:type/:id/entries", validate(entrySchema), addEntry);

export default r;