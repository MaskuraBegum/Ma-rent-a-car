import Purchase from "../models/Purchase.js";
import Vendor from "../models/Vendor.js";
import { checkInvoice, computeInvoice, round2 } from "../services/invoiceMath.js";

const DHAKA = "Asia/Dhaka";
const bad = (res, message, code = 400) => res.status(code).json({ message });
const notFound = (res) => res.status(404).json({ message: "Purchase not found" });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dayStart = (iso) => new Date(`${iso}T00:00:00+06:00`);
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: DHAKA });
const yearOf = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: DHAKA }).slice(0, 4);
const POPULATE = { path: "vendor", select: "name companyName phone address" };

// next free number, like PUR-2026-0001
async function nextPurchaseNo(date) {
  const prefix = `PUR-${yearOf(date)}-`;
  const used = await Purchase.find({ purchaseNo: new RegExp(`^${escapeRegex(prefix)}\\d+$`) }).select("purchaseNo").lean();
  const max = used.reduce((m, x) => Math.max(m, Number(x.purchaseNo.slice(prefix.length))), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// the payments decide Partial and Paid
function settle(p) {
  p.paidAmount = round2(p.payments.reduce((s, x) => s + x.amount, 0));
  p.balance = round2(p.grandTotal - p.paidAmount);
  if (["unpaid", "partial", "paid"].includes(p.status)) {
    p.status = p.paidAmount <= 0 ? "unpaid" : p.balance <= 0 ? "paid" : "partial";
  }
}

// works out the totals and stores them. Returns an error message or null
function applyAmounts(p, { items, discount = 0, vatPercent = 0, otherCharges = 0 }) {
  const calc = computeInvoice({ items, discount, vatPercent, otherCharges });
  const err = checkInvoice(items, calc, discount);
  if (err) return err;
  if (round2(p.payments.reduce((s, x) => s + x.amount, 0)) > calc.grandTotal) return "The total is less than the payments already made";
  p.items = calc.lines.map(({ net, ...line }) => line);
  p.discount = discount;
  p.vatPercent = vatPercent;
  p.otherCharges = otherCharges;
  p.subTotal = calc.subTotal;
  p.vatAmount = calc.vatAmount;
  p.grandTotal = calc.grandTotal;
  settle(p);
  return null;
}

export const nextNumber = async (req, res) => {
  res.json({ purchaseNo: await nextPurchaseNo(dayStart(req.query.date || todayIso())) });
};

// item names bought before, with the last rate, for the item box suggestions
export const itemCatalog = async (req, res) => {
  const rows = await Purchase.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $sort: { date: -1 } },
    { $unwind: "$items" },
    { $group: { _id: { $toLower: "$items.name" }, name: { $first: "$items.name" }, rate: { $first: "$items.rate" }, description: { $first: "$items.description" } } },
    { $sort: { name: 1 } },
    { $limit: 300 },
    { $project: { _id: 0, name: 1, rate: 1, description: 1 } },
  ]);
  res.json(rows);
};

export const listPurchases = async (req, res) => {
  const { status, vendor, from, to, search, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (vendor) filter.vendor = vendor;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = dayStart(from);
    if (to) filter.date.$lt = new Date(dayStart(to).getTime() + 86400000);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    const vendors = await Vendor.find({ $or: [{ name: rx }, { companyName: rx }] }).select("_id").lean();
    filter.$or = [{ purchaseNo: rx }, { refNo: rx }, { vendor: { $in: vendors.map((v) => v._id) } }];
  }
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Number(limit) || 30, 200);

  const [items, total, sums] = await Promise.all([
    Purchase.find(filter).populate(POPULATE).select("-items").sort({ date: -1, createdAt: -1 }).skip((p - 1) * l).limit(l),
    Purchase.countDocuments(filter),
    Purchase.aggregate([
      { $match: { ...filter, status: filter.status ? filter.status : { $in: ["unpaid", "partial", "paid"] } } },
      { $group: { _id: null, billed: { $sum: "$grandTotal" }, paid: { $sum: "$paidAmount" }, balance: { $sum: "$balance" } } },
    ]),
  ]);
  const t = sums[0] || {};
  res.json({ items, total, page: p, limit: l, totals: { billed: round2(t.billed || 0), paid: round2(t.paid || 0), balance: round2(t.balance || 0) } });
};

export const getPurchase = async (req, res) => {
  const doc = await Purchase.findById(req.params.id).populate(POPULATE);
  if (!doc) return notFound(res);
  res.json(doc);
};

export const createPurchase = async (req, res) => {
  const b = req.body;
  if (b.dueDate < b.date) return bad(res, "The due date cannot be before the purchase date");
  if (!(await Vendor.exists({ _id: b.vendor }))) return bad(res, "Supplier not found");

  const doc = new Purchase({
    vendor: b.vendor,
    status: b.status || "draft",
    purchaseNo: b.purchaseNo || (await nextPurchaseNo(b.date)),
    refNo: b.refNo,
    date: b.date,
    dueDate: b.dueDate,
    notes: b.notes,
    footer: b.footer,
  });
  if (await Purchase.exists({ purchaseNo: doc.purchaseNo })) return bad(res, `${doc.purchaseNo} is already used`);
  const err = applyAmounts(doc, b);
  if (err) return bad(res, err);
  await doc.save();
  await doc.populate(POPULATE);
  res.status(201).json(doc);
};

export const updatePurchase = async (req, res) => {
  const doc = await Purchase.findById(req.params.id);
  if (!doc) return notFound(res);
  if (doc.status === "cancelled") return bad(res, "A cancelled purchase cannot be edited. Re-open it as a draft first");
  const b = req.body;

  if (b.vendor && !(await Vendor.exists({ _id: b.vendor }))) return bad(res, "Supplier not found");
  if (b.purchaseNo && b.purchaseNo !== doc.purchaseNo && (await Purchase.exists({ purchaseNo: b.purchaseNo }))) {
    return bad(res, `${b.purchaseNo} is already used`);
  }
  const date = b.date ?? doc.date;
  const dueDate = b.dueDate ?? doc.dueDate;
  if (dueDate < date) return bad(res, "The due date cannot be before the purchase date");

  for (const k of ["vendor", "purchaseNo", "refNo", "date", "dueDate", "notes", "footer"]) if (b[k] !== undefined) doc[k] = b[k];
  if (b.status && doc.payments.length === 0) doc.status = b.status; // with payments, the payments decide

  const err = applyAmounts(doc, {
    items: b.items ?? doc.items.map((i) => i.toObject()),
    discount: b.discount ?? doc.discount,
    vatPercent: b.vatPercent ?? doc.vatPercent,
    otherCharges: b.otherCharges ?? doc.otherCharges,
  });
  if (err) return bad(res, err);
  await doc.save();
  await doc.populate(POPULATE);
  res.json(doc);
};

export const setStatus = async (req, res) => {
  const doc = await Purchase.findById(req.params.id);
  if (!doc) return notFound(res);
  const to = req.body.status;
  if (doc.payments.length > 0 && to !== doc.status) {
    return bad(res, "This purchase has payments. Delete the payments first");
  }
  if (doc.status === "cancelled" && to !== "draft") return bad(res, "Re-open the purchase as a draft first");
  doc.status = to;
  settle(doc);
  await doc.save();
  await doc.populate(POPULATE);
  res.json(doc);
};

export const addPayment = async (req, res) => {
  const doc = await Purchase.findById(req.params.id);
  if (!doc) return notFound(res);
  if (!["unpaid", "partial"].includes(doc.status)) {
    return bad(res, doc.status === "draft" ? "Confirm the purchase (Unpaid) before adding payments" : "Nothing left to pay on this purchase");
  }
  const { date, amount, method, note } = req.body;
  if (round2(doc.paidAmount + amount) > doc.grandTotal) return bad(res, "The payment is more than the balance");
  doc.payments.push({ date, amount, method: method || "cash", note });
  settle(doc);
  await doc.save();
  await doc.populate(POPULATE);
  res.status(201).json(doc);
};

export const deletePayment = async (req, res) => {
  const doc = await Purchase.findById(req.params.id);
  if (!doc) return notFound(res);
  const pay = doc.payments.id(req.params.paymentId);
  if (!pay) return bad(res, "Payment not found", 404);
  pay.deleteOne();
  settle(doc);
  await doc.save();
  await doc.populate(POPULATE);
  res.json(doc);
};