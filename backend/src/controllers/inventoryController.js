import InventoryCategory from "../models/InventoryCategory.js";
import InventoryUnit from "../models/InventoryUnit.js";
import InventoryItem, { ASSET_ACCOUNTS } from "../models/InventoryItem.js";

const bad = (res, message, code = 400) => res.status(code).json({ message });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// categories and units work the same way: list with item count, add, edit, deactivate, delete
const lookup = (Model, field, word) => ({
  list: async (req, res) => {
    const [rows, counts] = await Promise.all([
      Model.find().sort({ createdAt: 1 }).lean(),
      InventoryItem.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]),
    ]);
    const count = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json({ items: rows.map((r) => ({ ...r, itemCount: count.get(String(r._id)) || 0 })) });
  },
  create: async (req, res) => res.status(201).json(await Model.create(req.body)),
  update: async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return bad(res, `${word} not found`, 404);
    res.json(doc);
  },
  remove: async (req, res) => {
    const used = await InventoryItem.countDocuments({ [field]: req.params.id });
    if (used > 0) return bad(res, `${used} item${used > 1 ? "s use" : " uses"} this ${word.toLowerCase()}. Deactivate it instead`);
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return bad(res, `${word} not found`, 404);
    res.json({ deleted: true });
  },
});

export const categories = lookup(InventoryCategory, "category", "Category");
export const units = lookup(InventoryUnit, "unit", "Unit");

const POPULATE = [
  { path: "category", select: "name isActive" },
  { path: "unit", select: "name shortName isActive" },
];

async function checkRefs(b) {
  if (b.category && !(await InventoryCategory.exists({ _id: b.category }))) return "Category not found";
  if (b.unit && !(await InventoryUnit.exists({ _id: b.unit }))) return "Unit not found";
  return null;
}

export const listItems = async (req, res) => {
  const { search, category, active, low, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;
  if (category) filter.category = category;
  if (low === "true") filter.$expr = { $lte: ["$currentStock", "$minStock"] };
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Number(limit) || 50, 200);
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    InventoryItem.countDocuments(filter),
  ]);
  res.json({ items, total, page: p, limit: l });
};

export const accountOptions = (req, res) => res.json(ASSET_ACCOUNTS);

export const getItem = async (req, res) => {
  const doc = await InventoryItem.findById(req.params.id).populate(POPULATE);
  if (!doc) return bad(res, "Item not found", 404);
  res.json(doc);
};

export const createItem = async (req, res) => {
  const err = await checkRefs(req.body);
  if (err) return bad(res, err);
  const doc = await InventoryItem.create(req.body);
  await doc.populate(POPULATE);
  res.status(201).json(doc);
};

export const updateItem = async (req, res) => {
  const err = await checkRefs(req.body);
  if (err) return bad(res, err);
  const doc = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(POPULATE);
  if (!doc) return bad(res, "Item not found", 404);
  res.json(doc);
};

export const deleteItem = async (req, res) => {
  const doc = await InventoryItem.findByIdAndDelete(req.params.id);
  if (!doc) return bad(res, "Item not found", 404);
  res.json({ deleted: true });
};