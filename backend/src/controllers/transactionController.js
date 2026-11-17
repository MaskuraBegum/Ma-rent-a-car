import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction, { IN_SOURCES, OUT_CATEGORIES, PAY_METHODS } from "../models/Transaction.js";

const bad = (res, message, code = 400) => res.status(code).json({ message });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const options = (req, res) => res.json({ sources: IN_SOURCES, categories: OUT_CATEGORIES, methods: PAY_METHODS });

// ---------- accounts ----------
export async function balances() {
  const [accounts, inn, out, from, to] = await Promise.all([
    Account.find().sort({ createdAt: 1 }).lean(),
    Transaction.aggregate([{ $match: { type: "in" } }, { $group: { _id: "$account", t: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "out" } }, { $group: { _id: "$account", t: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "transfer" } }, { $group: { _id: "$account", t: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "transfer" } }, { $group: { _id: "$toAccount", t: { $sum: "$amount" } } }]),
  ]);
  const m = (rows) => new Map(rows.map((r) => [String(r._id), r.t]));
  const [mi, mo, mf, mt] = [m(inn), m(out), m(from), m(to)];
  return accounts.map((a) => {
    const k = String(a._id);
    const cashIn = (mi.get(k) || 0) + (mt.get(k) || 0);
    const cashOut = (mo.get(k) || 0) + (mf.get(k) || 0);
    return { ...a, cashIn: round2(cashIn), cashOut: round2(cashOut), balance: round2((a.openingBalance || 0) + cashIn - cashOut) };
  });
}

export const listAccounts = async (req, res) => {
  const items = await balances();
  res.json({ items: req.query.active === "true" ? items.filter((a) => a.isActive) : items });
};
export const createAccount = async (req, res) => res.status(201).json(await Account.create(req.body));
export const updateAccount = async (req, res) => {
  const doc = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doc) return bad(res, "Account not found", 404);
  res.json(doc);
};
export const deleteAccount = async (req, res) => {
  const used = await Transaction.countDocuments({ $or: [{ account: req.params.id }, { toAccount: req.params.id }] });
  if (used > 0) return bad(res, `${used} transaction${used > 1 ? "s use" : " uses"} this account. Deactivate it instead`);
  const doc = await Account.findByIdAndDelete(req.params.id);
  if (!doc) return bad(res, "Account not found", 404);
  res.json({ deleted: true });
};

// ---------- transactions ----------
const POPULATE = [
  { path: "account", select: "name type" },
  { path: "toAccount", select: "name type" },
];

export const list = async (req, res) => {
  const { type, account, from, to, search, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (account && mongoose.isValidObjectId(account)) filter.$or = [{ account }, { toAccount: account }];
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(`${from}T00:00:00+06:00`);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59.999+06:00`);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    filter.$and = [{ $or: [{ description: rx }, { voucherNo: rx }, { transactionId: rx }, { payee: rx }, { source: rx }, { category: rx }] }];
  }
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Number(limit) || 50, 200);
  const [items, total, sums] = await Promise.all([
    Transaction.find(filter).populate(POPULATE).sort({ date: -1, createdAt: -1 }).skip((p - 1) * l).limit(l),
    Transaction.countDocuments(filter),
    Transaction.aggregate([{ $match: filter }, { $group: { _id: "$type", t: { $sum: "$amount" } } }]),
  ]);
  const t = Object.fromEntries(sums.map((s) => [s._id, round2(s.t)]));
  res.json({ items, total, page: p, limit: l, totals: { in: t.in || 0, out: t.out || 0, transfer: t.transfer || 0 } });
};

export const create = async (req, res) => {
  const b = req.body;
  const ids = [b.account, b.toAccount].filter(Boolean);
  if (b.type === "transfer" && String(b.account) === String(b.toAccount)) return bad(res, "Choose two different accounts");
  const found = await Account.find({ _id: { $in: ids } }).select("isActive");
  if (found.length !== new Set(ids.map(String)).size) return bad(res, "Account not found");
  if (found.some((a) => !a.isActive)) return bad(res, "An account you chose is inactive");
  const doc = await Transaction.create(b);
  await doc.populate(POPULATE);
  res.status(201).json(doc);
};

// only the notes can change; amount, type and accounts stay so the balances stay true
export const update = async (req, res) => {
  const doc = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(POPULATE);
  if (!doc) return bad(res, "Transaction not found", 404);
  res.json(doc);
};

export const remove = async (req, res) => {
  const doc = await Transaction.findByIdAndDelete(req.params.id);
  if (!doc) return bad(res, "Transaction not found", 404);
  res.json({ deleted: true });
};