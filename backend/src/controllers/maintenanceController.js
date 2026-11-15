import MaintenanceLog, { MAINTENANCE_TYPES } from "../models/MaintenanceLog.js";
import Expense from "../models/Expense.js";
import Car from "../models/Car.js";
import Trip from "../models/Trip.js";
import Invoice from "../models/Invoice.js";

const POPULATE = [
  { path: "car", select: "companyName model registrationNo" },
  { path: "trip", select: "tripNo location date" },
  { path: "supplierBill", select: "invoiceNo grandTotal status billTo" },
];
const yearOf = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }).slice(0, 4);

// next free reference, like MNT-2026-0002
async function nextRefNo(date) {
  const prefix = `MNT-${yearOf(date)}-`;
  const used = await MaintenanceLog.find({ refNo: new RegExp(`^${prefix}\\d+$`) }).select("refNo").lean();
  const max = used.reduce((m, x) => Math.max(m, Number(x.refNo.slice(prefix.length))), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// logs saved before reference numbers existed get theirs, oldest first
async function giveMissingRefs() {
  const missing = await MaintenanceLog.find({ refNo: null }).sort({ createdAt: 1 });
  for (const log of missing) {
    log.refNo = await nextRefNo(log.date);
    await log.save();
  }
}

// the trip number typed on the form -> the trip, and the bill must be a vendor bill
async function resolveLinks(body) {
  const out = {};
  if (body.tripNo !== undefined) {
    if (body.tripNo === null) out.trip = null;
    else {
      const trip = await Trip.findOne({ tripNo: body.tripNo }).select("_id");
      if (!trip) return { error: `Trip #${body.tripNo} not found` };
      out.trip = trip._id;
    }
  }
  if (body.supplierBill) {
    const bill = await Invoice.findOne({ _id: body.supplierBill, type: "vendor", status: { $ne: "cancelled" } }).select("_id");
    if (!bill) return { error: "Supplier bill not found" };
  }
  return { out };
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bad = (res, message, code = 400) => res.status(code).json({ message });

// The cost lives in one Expense (category Maintenance). Keep it in step with the log.
async function syncExpense(log) {
  const wanted = log.isActive && log.cost > 0;
  const text = `${MAINTENANCE_TYPES[log.type]}${log.description ? `: ${log.description}` : ""}`.slice(0, 300);

  if (wanted) {
    const data = { date: log.date, category: "maintenance", car: log.car, amount: log.cost, description: text, isActive: true };
    const existing = log.expense ? await Expense.findById(log.expense) : null;
    if (existing) {
      existing.set(data);
      await existing.save();
    } else {
      log.expense = (await Expense.create(data))._id;
      await log.save();
    }
  } else if (log.expense) {
    await Expense.findByIdAndUpdate(log.expense, { isActive: false });
  }
}

export const listLogs = async (req, res) => {
  await giveMissingRefs();
  const { car, type, status, from, to, search, active, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;
  if (car) filter.car = car;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(`${from}T00:00:00+06:00`);
    if (to) filter.date.$lte = new Date(`${to}T00:00:00+06:00`);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    filter.$or = [{ description: rx }, { workshop: rx }, { refNo: rx }];
  }
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Number(limit) || 50, 200);
  const [items, total] = await Promise.all([
    MaintenanceLog.find(filter).populate(POPULATE).sort({ date: -1, createdAt: -1 }).skip((p - 1) * l).limit(l),
    MaintenanceLog.countDocuments(filter),
  ]);
  res.json({ items, total, page: p, limit: l });
};

export const getLog = async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id).populate(POPULATE);
  if (!log) return bad(res, "Maintenance log not found", 404);
  res.json(log);
};

export const createLog = async (req, res) => {
  if (!(await Car.exists({ _id: req.body.car }))) return bad(res, "Vehicle not found");
  const { tripNo, ...data } = req.body;
  const links = await resolveLinks(req.body);
  if (links.error) return bad(res, links.error);

  let log;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      log = await MaintenanceLog.create({ ...data, ...links.out, refNo: await nextRefNo(data.date) });
      break;
    } catch (e) {
      if (!(e.code === 11000 && attempt < 2)) throw e; // two logs saved at the same moment: take the next number
    }
  }
  await syncExpense(log);
  res.status(201).json(await log.populate(POPULATE));
};

export const updateLog = async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) return bad(res, "Maintenance log not found", 404);
  if (req.body.car && String(req.body.car) !== String(log.car) && !(await Car.exists({ _id: req.body.car }))) {
    return bad(res, "Vehicle not found");
  }
  const { tripNo, ...data } = req.body;
  const links = await resolveLinks(req.body);
  if (links.error) return bad(res, links.error);
  log.set({ ...data, ...links.out });
  if (!log.refNo) log.refNo = await nextRefNo(log.date);
  await log.save();
  await syncExpense(log);
  res.json(await log.populate(POPULATE));
};

// logs are never removed: deactivating also takes the cost out of the expense reports
export const deactivateLog = async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) return bad(res, "Maintenance log not found", 404);
  log.isActive = false;
  await log.save();
  await syncExpense(log);
  res.json(await log.populate(POPULATE));
};
