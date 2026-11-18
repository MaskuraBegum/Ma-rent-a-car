import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import Driver from "../models/Driver.js";
import Trip from "../models/Trip.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import { HrSettings, LeaveType, LeaveRequest, Attendance, SalaryStructure, Advance, Fine, Payroll } from "../models/HrModels.js";
import { computeSalary, dkey, monthRange, resolveMonth } from "../services/payrollService.js";

const bad = (res, message, code = 400) => res.status(code).json({ message });
const POP = { path: "employee", select: "name designation phone" };
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// ---------- who counts as an employee: active staff and drivers ----------
async function employees() {
  const [staff, drivers] = await Promise.all([
    Staff.find({ isActive: true }).select("name designation phone").sort({ name: 1 }).lean(),
    Driver.find({ isActive: true }).select("name phone").sort({ name: 1 }).lean(),
  ]);
  const row = (e, employeeModel, designation) => ({
    key: `${employeeModel}:${e._id}`, employeeModel, employee: String(e._id), name: e.name, designation,
  });
  return [...staff.map((e) => row(e, "Staff", e.designation || "Office staff")), ...drivers.map((e) => row(e, "Driver", "Driver"))];
}
export const listEmployees = async (req, res) => res.json({ items: await employees() });

// ---------- settings ----------
export async function getSettings() {
  return (await HrSettings.findOne({ key: "main" }).lean()) || new HrSettings({ key: "main" }).toObject();
}
export const readSettings = async (req, res) => res.json(await getSettings());
export const saveSettings = async (req, res) =>
  res.json(await HrSettings.findOneAndUpdate({ key: "main" }, req.body, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }));

// ---------- small helper for the plain list pages ----------
function simple(Model, { dateField, populate = [], guard } = {}) {
  return {
    list: async (req, res) => {
      const { employee, status, month, active } = req.query;
      const f = {};
      if (employee && mongoose.isValidObjectId(employee)) f.employee = employee;
      if (status) f.status = status;
      if (active === "true") f.isActive = true;
      if (month && MONTH.test(month) && dateField) {
        const { start, end } = monthRange(month);
        f[dateField] = { $gte: start, $lt: end };
      }
      res.json({ items: await Model.find(f).populate(populate).sort({ [dateField || "createdAt"]: -1, createdAt: -1 }).limit(500) });
    },
    update: async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(populate);
      if (!doc) return bad(res, "Not found", 404);
      res.json(doc);
    },
    remove: async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return bad(res, "Not found", 404);
      const why = guard && (await guard(doc));
      if (why) return bad(res, why);
      await doc.deleteOne();
      res.json({ deleted: true });
    },
  };
}

// ---------- leave types ----------
const lt = simple(LeaveType, { guard: async (d) => ((await LeaveRequest.countDocuments({ leaveType: d._id })) ? "Leave requests use this type. Deactivate it instead" : null) });
export const leaveTypes = { ...lt, create: async (req, res) => res.status(201).json(await LeaveType.create(req.body)) };

// ---------- leave requests ----------
const leaveSimple = simple(LeaveRequest, { dateField: "from", populate: [POP, { path: "leaveType", select: "name isPaid" }] });
export const leaves = {
  list: leaveSimple.list,
  remove: leaveSimple.remove,
  create: async (req, res) => {
    const b = req.body;
    const type = await LeaveType.findById(b.leaveType);
    if (!type || !type.isActive) return bad(res, "Leave type not found");
    const days = Math.round((b.to - b.from) / 86400000) + 1;
    if (type.maxDaysPerYear > 0) {
      const y = dkey(b.from).slice(0, 4);
      const used = await LeaveRequest.aggregate([
        { $match: { employee: new mongoose.Types.ObjectId(b.employee), leaveType: type._id, status: { $in: ["pending", "approved"] }, from: { $gte: new Date(`${y}-01-01T00:00:00+06:00`), $lt: new Date(`${Number(y) + 1}-01-01T00:00:00+06:00`) } } },
        { $group: { _id: null, d: { $sum: "$days" } } },
      ]);
      const left = type.maxDaysPerYear - (used[0]?.d || 0);
      if (days > left) return bad(res, `Only ${Math.max(left, 0)} day(s) of ${type.name} left this year`);
    }
    const doc = await LeaveRequest.create({ ...b, days });
    await doc.populate([POP, { path: "leaveType", select: "name isPaid" }]);
    res.status(201).json(doc);
  },
  update: leaveSimple.update, // status only
};

// ---------- advances ----------
const adv = simple(Advance, { dateField: "date", populate: [POP], guard: (d) => (d.repaid > 0 ? "Part of this advance is already repaid" : null) });
export const advances = {
  ...adv,
  create: async (req, res) => {
    const doc = await Advance.create(req.body);
    await doc.populate(POP);
    res.status(201).json(doc);
  },
};

// ---------- fines ----------
const fn = simple(Fine, { dateField: "date", populate: [POP], guard: (d) => (d.status === "deducted" ? "This fine is already deducted from a salary" : null) });
export const fines = {
  ...fn,
  create: async (req, res) => {
    const doc = await Fine.create(req.body);
    await doc.populate(POP);
    res.status(201).json(doc);
  },
  update: async (req, res) => {
    const doc = await Fine.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (doc.status === "deducted") return bad(res, "Already deducted from a salary");
    doc.status = req.body.status;
    await doc.save();
    await doc.populate(POP);
    res.json(doc);
  },
};

// ---------- salary structures ----------
const st = simple(SalaryStructure, { dateField: "effectiveFrom" });
export const structures = { ...st, create: async (req, res) => res.status(201).json(await SalaryStructure.create(req.body)) };
export const designations = async (req, res) => {
  const staff = await Staff.distinct("designation");
  res.json({ items: [...new Set(["Driver", "Manager", "Accountant", "Office staff", "Helper", "Mechanic", "Other", ...staff.filter(Boolean)])] });
};

// ---------- attendance ----------
async function leaveMap(start, end) {
  const rows = await LeaveRequest.find({ status: "approved", from: { $lt: end }, to: { $gte: start } }).populate("leaveType", "isPaid").lean();
  const m = new Map();
  for (const l of rows) {
    const k = String(l.employee);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push({ from: dkey(l.from), to: dkey(l.to), paid: l.leaveType?.isPaid !== false });
  }
  return m;
}

export const dayAttendance = async (req, res) => {
  const date = String(req.query.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, "Choose a date");
  const at = new Date(`${date}T00:00:00+06:00`);
  const [emps, recs, settings, lv] = await Promise.all([
    employees(),
    Attendance.find({ date: at }).lean(),
    getSettings(),
    leaveMap(at, new Date(at.getTime() + 86400000)),
  ]);
  const byEmp = new Map(recs.map((r) => [String(r.employee), r]));
  const weekly = settings.weeklyHolidays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  res.json({
    date,
    weekly,
    items: emps.map((e) => {
      const r = byEmp.get(e.employee);
      const onLeave = (lv.get(e.employee) || []).some((l) => date >= l.from && date <= l.to);
      return { ...e, status: r?.status || "", note: r?.note || "", auto: weekly ? "W" : onLeave ? "L" : "" };
    }),
  });
};

export const saveAttendance = async (req, res) => {
  const { date, entries } = req.body;
  const ops = entries.map((e) =>
    e.status
      ? { updateOne: { filter: { employee: e.employee, date }, update: { $set: { employeeModel: e.employeeModel, employee: e.employee, date, status: e.status, note: e.note || "" } }, upsert: true } }
      : { deleteOne: { filter: { employee: e.employee, date } } }
  );
  if (ops.length) await Attendance.bulkWrite(ops);
  res.json({ saved: entries.length });
};

export const monthAttendance = async (req, res) => {
  const month = String(req.query.month || "");
  if (!MONTH.test(month)) return bad(res, "Choose a month");
  const { start, end } = monthRange(month);
  const [emps, recs, settings, lv] = await Promise.all([
    employees(),
    Attendance.find({ date: { $gte: start, $lt: end } }).lean(),
    getSettings(),
    leaveMap(start, end),
  ]);
  const by = new Map();
  for (const r of recs) {
    const k = String(r.employee);
    if (!by.has(k)) by.set(k, new Map());
    by.get(k).set(dkey(r.date), r);
  }
  let days = 0;
  const items = emps.map((e) => {
    const r = resolveMonth(month, settings, by.get(e.employee) || new Map(), lv.get(e.employee) || []);
    days = r.days;
    const c = r.counts;
    return { ...e, codes: r.codes, totals: { P: c.P, A: c.A, L: c.Lpaid + c.Lunpaid, HD: c.HD, H: c.H, W: c.W } };
  });
  res.json({ month, days: days || monthRange(month).days, items });
};

// ---------- payroll ----------
export const listPayroll = async (req, res) => {
  const month = String(req.query.month || "");
  if (!MONTH.test(month)) return bad(res, "Choose a month");
  res.json({ items: await Payroll.find({ month }).sort({ name: 1 }).lean() });
};

export const generatePayroll = async (req, res) => {
  const { month } = req.body;
  const { start, end, days } = monthRange(month);
  const settings = await getSettings();
  const [emps, structs, atts, lv, advs, fineRows, tripRows, existing] = await Promise.all([
    employees(),
    SalaryStructure.find({ isActive: true, effectiveFrom: { $lt: end } }).sort({ effectiveFrom: -1 }).lean(),
    Attendance.find({ date: { $gte: start, $lt: end } }).lean(),
    leaveMap(start, end),
    Advance.find({ status: "approved" }).lean(),
    Fine.find({ status: "pending", date: { $gte: start, $lt: end } }).lean(),
    Trip.aggregate([{ $match: { status: "completed", driver: { $ne: null }, date: { $gte: start, $lt: end } } }, { $group: { _id: "$driver", n: { $sum: 1 } } }]),
    Payroll.find({ month }).select("employee status").lean(),
  ]);
  const locked = new Set(existing.filter((p) => p.status !== "draft").map((p) => String(p.employee)));
  await Payroll.deleteMany({ month, status: "draft" });

  const attBy = new Map();
  for (const r of atts) {
    const k = String(r.employee);
    if (!attBy.has(k)) attBy.set(k, new Map());
    attBy.get(k).set(dkey(r.date), r);
  }
  const trips = new Map(tripRows.map((t) => [String(t._id), t.n]));
  const docs = [];
  const skipped = [];
  for (const e of emps) {
    if (locked.has(e.employee)) continue;
    const s = structs.find((x) => x.designation.toLowerCase() === e.designation.toLowerCase());
    if (!s) {
      skipped.push(e.name);
      continue;
    }
    const r = resolveMonth(month, settings, attBy.get(e.employee) || new Map(), lv.get(e.employee) || []);
    const advanceDue = advs
      .filter((a) => String(a.employee) === e.employee && a.amount - a.repaid > 0)
      .reduce((sum, a) => sum + Math.min(a.monthlyDeduction || a.amount, a.amount - a.repaid), 0);
    const finesDue = fineRows.filter((f) => String(f.employee) === e.employee).reduce((sum, f) => sum + f.amount, 0);
    const n = trips.get(e.employee) || 0;
    const c = computeSalary({
      base: s.baseSalary, food: s.foodAllowance, travel: s.travelAllowance, other: s.otherAllowance,
      perTrip: s.perTripIncentive, trips: n, days, counts: r.counts, settings, advanceDue, finesDue,
    });
    docs.push({
      month, employeeModel: e.employeeModel, employee: e.employee, name: e.name, designation: e.designation,
      daysInMonth: days, workingDays: c.workingDays, counts: r.counts, paidDays: c.paidDays, perDay: c.perDay,
      base: s.baseSalary, earnedBase: c.earnedBase, trips: n, incentive: c.incentive,
      food: s.foodAllowance, travel: s.travelAllowance, other: s.otherAllowance,
      gross: c.gross, advance: c.advance, fines: c.fines, net: c.net,
    });
  }
  if (docs.length) await Payroll.insertMany(docs);
  res.json({ created: docs.length, kept: locked.size, skipped });
};

export const payrollStatus = async (req, res) => {
  const p = await Payroll.findById(req.params.id);
  if (!p) return bad(res, "Salary sheet not found", 404);
  const { status, account, paidDate } = req.body;
  if (p.status === "paid") return bad(res, "Already paid");
  if (status === "approved" && p.status !== "draft") return bad(res, "Only a draft can be approved");

  if (status === "paid") {
    if (account) {
      const acc = await Account.findById(account);
      if (!acc || !acc.isActive) return bad(res, "Account not found");
    }
    const when = paidDate || new Date(`${dkey(new Date())}T00:00:00+06:00`);
    const { start, end } = monthRange(p.month);
    // advances: take the installments, oldest first
    let left = p.advance;
    const open = await Advance.find({ employee: p.employee, status: "approved" }).sort({ date: 1 });
    for (const a of open) {
      if (left <= 0) break;
      const part = Math.min(a.monthlyDeduction || a.amount, a.amount - a.repaid, left);
      if (part <= 0) continue;
      a.repaid += part;
      if (a.repaid >= a.amount) a.status = "cleared";
      left -= part;
      await a.save();
    }
    await Fine.updateMany({ employee: p.employee, status: "pending", date: { $gte: start, $lt: end } }, { status: "deducted" });
    if (account && p.net > 0) {
      await Transaction.create({
        type: "out", date: when, account, category: "Salary", payee: p.name, amount: p.net,
        description: `Salary ${p.month}`, voucherNo: `SAL-${p.month}`,
      });
    }
    p.paidDate = when;
  }
  p.status = status;
  await p.save();
  res.json(p);
};

export const deletePayroll = async (req, res) => {
  const p = await Payroll.findById(req.params.id);
  if (!p) return bad(res, "Salary sheet not found", 404);
  if (p.status !== "draft") return bad(res, "Only a draft can be deleted");
  await p.deleteOne();
  res.json({ deleted: true });
};