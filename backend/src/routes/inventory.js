import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  categorySchema, categoryUpdateSchema, unitSchema, unitUpdateSchema, itemSchema, itemUpdateSchema,
} from "../validators/inventory.js";
import {
  accountOptions, categories, createItem, deleteItem, getItem, listItems, units, updateItem,
} from "../controllers/inventoryController.js";

const r = Router();

r.get("/categories", categories.list);
r.post("/categories", validate(categorySchema), categories.create);
r.patch("/categories/:id", validate(categoryUpdateSchema), categories.update);
r.delete("/categories/:id", categories.remove);

r.get("/units", units.list);
r.post("/units", validate(unitSchema), units.create);
r.patch("/units/:id", validate(unitUpdateSchema), units.update);
r.delete("/units/:id", units.remove);

r.get("/accounts", accountOptions);
r.get("/items", listItems);
r.post("/items", validate(itemSchema), createItem);
r.get("/items/:id", getItem);
r.patch("/items/:id", validate(itemUpdateSchema), updateItem);
r.delete("/items/:id", deleteItem);

export default r;