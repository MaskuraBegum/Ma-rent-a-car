import LedgerHead from "../models/LedgerHead.js";
import { balances } from "./transactionController.js";

const bad = (res, message, code = 400) => res.status(code).json({ message });

const DEFAULTS = [
  ["assets", "Money in Transit", ["Cash in transit", "Cheques in hand"]],
  ["assets", "Property, Plant & Equipment", ["Vehicles", "Office equipment"]],
  ["assets", "Other Short-Term Assets", ["Advance to staff", "Security deposits"]],
  ["liabilities", "", ["Loans payable", "Accrued expenses"]],
  ["income", "", ["Trip income", "Other income"]],
  ["expenses", "", ["Fuel", "Salary", "Maintenance", "Office"]],
  ["equity", "", ["Owner's capital", "Retained earnings"]],
];

// the first time the chart is opened, start with a sensible set of heads
async function seedOnce() {
  if (await LedgerHead.estimatedDocumentCount()) return;
  const docs = DEFAULTS.flatMap(([group, subGroup, names]) => names.map((name) => ({ name, group, subGroup })));
  await LedgerHead.insertMany(docs, { ordered: false }).catch(() => {});
}

export const chart = async (req, res) => {
  await seedOnce();
  const [accounts, heads] = await Promise.all([balances(), LedgerHead.find().sort({ createdAt: 1 }).lean()]);
  res.json({ accounts, heads });
};

export const createHead = async (req, res) => res.status(201).json(await LedgerHead.create(req.body));

export const updateHead = async (req, res) => {
  const doc = await LedgerHead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doc) return bad(res, "Ledger head not found", 404);
  res.json(doc);
};

export const deleteHead = async (req, res) => {
  const doc = await LedgerHead.findByIdAndDelete(req.params.id);
  if (!doc) return bad(res, "Ledger head not found", 404);
  res.json({ deleted: true });
};