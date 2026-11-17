
import Invoice from "../models/Invoice.js";
import Trip from "../models/Trip.js";
import Expense, { EXPENSE_CATEGORIES } from "../models/Expense.js";
import MaintenanceLog from "../models/MaintenanceLog.js";
import LedgerEntry from "../models/LedgerEntry.js";
import { partyBalances } from "../services/ledgerService.js";
import { round2 } from "../services/invoiceMath.js";

const DHAKA = "Asia/Dhaka";
const OPEN = ["sent", "unpaid", "partial", "overdue"]; // issued and still owed
const sum = (rows, key = "total") => round2(rows.reduce((s, r) => s + (r[key] || 0), 0));
const monthOf = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: DHAKA }).slice(0, 7);

// the last 6 month keys ("2026-06" ... "2026-11"), oldest first
function lastMonths(n = 6) {
  const [y, m] = monthOf(new Date()).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export const dashboard = async (req, res) => {
  const months = lastMonths(6);
  const thisMonth = months[months.length - 1];
  const since = new Date(`${months[0]}-01T00:00:00+06:00`);
  const todayStart = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: DHAKU })}T00:00:00+06:00`);
  const byMonth = { $dateToString: { format: "%Y-%m", date: "$date", timezone: DHAKU } };

  // a maintenance cost that was paid through a supplier bill is already in the bill's payments
  const billed = await MaintenanceLog.find({ supplierBill: { $ne: null }, expense: { $ne: null } }).select("expense").lean();
  const billedExpenseIds = billed.map((l) => l.expense);

  const [
    receivable, payable, overdueCount,
    cashIn, cashOutBills, cashOutLedger, cashOutExpenses,
    driverDues, vendorDues,
    tripStatus, pendingMaint,
    incomeByMonth, expenseByMonth, expenseByCategory,
    payableList, receivableList,
    payIn, payOut, ledgerPays, expenseList,
    completedMonth, upcoming,
  ] = await Promise.all([
    Invoice.aggregate([{ $match: { type: "client", status: { $in: OPEN }, balance: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$balance" }, count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { type: "vendor", status: { $in: OPEN }, balance: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$balance" }, count: { $sum: 1 } } }]),
    Invoice.countDocuments({ type: "client", status: { $in: OPEN }, balance: { $gt: 0 }, dueDate: { $lt: todayStart } }),

    Invoice.aggregate([{ $match: { type: "client" } }, { $unwind: "$payments" }, { $group: { _id: null, total: { $sum: "$payments.amount" } } }]),
    Invoice.aggregate([{ $match: { type: "vendor" } }, { $unwind: "$payments" }, { $group: { _id: null, total: { $sum: "$payments.amount" } } }]),
    LedgerEntry.aggregate([{ $match: { kind: "payment" } }, { $group: { _id: null, total: { $sum: { $multiply: ["$delta", -1] } } } }]),
    Expense.aggregate([{ $match: { isActive: true, _id: { $nin: billedExpenseIds } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),

    partyBalances("driver"),
    partyBalances("vendor"),

    Trip.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    MaintenanceLog.countDocuments({ isActive: true, status: { $in: ["pending", "in_progress"] } }),

    Invoice.aggregate([
      { $match: { type: "client" } }, { $unwind: "$payments" },
      { $match: { "payments.date": { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$payments.date", timezone: DHAKA } }, total: { $sum: "$payments.amount" } } },
    ]),
    Expense.aggregate([{ $match: { isActive: true, date: { $gte: since } } }, { $group: { _id: byMonth, total: { $sum: "$amount" } } }]),
    Expense.aggregate([
      { $match: { isActive: true, date: { $gte: new Date(`${thisMonth}-01T00:00:00+06:00`) } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),

    Invoice.find({ type: "vendor", status: { $in: OPEN }, balance: { $gt: 0 } }).sort({ dueDate: 1 }).limit(6).select("invoiceNo billTo balance grandTotal dueDate status").lean(),
    Invoice.find({ type: "client", status: { $in: OPEN }, balance: { $gt: 0 } }).sort({ dueDate: 1 }).limit(6).select("invoiceNo billTo balance grandTotal dueDate status").lean(),

    Invoice.aggregate([{ $match: { type: "client" } }, { $unwind: "$payments" }, { $sort: { "payments.date": -1 } }, { $limit: 8 }, { $project: { invoiceNo: 1, name: "$billTo.name", amount: "$payments.amount", date: "$payments.date", method: "$payments.method" } }]),
    Invoice.aggregate([{ $match: { type: "vendor" } }, { $unwind: "$payments" }, { $sort: { "payments.date": -1 } }, { $limit: 8 }, { $project: { invoiceNo: 1, name: "$billTo.name", amount: "$payments.amount", date: "$payments.date", method: "$payments.method" } }]),
    LedgerEntry.find({ kind: "payment" }).sort({ date: -1 }).limit(8).populate("driver", "name").populate("vendor", "name").lean(),
    Expense.find({ isActive: true }).sort({ date: -1, createdAt: -1 }).limit(6).populate("car", "companyName model registrationNo").select("date category amount description car").lean(),

    Trip.countDocuments({ status: "completed", date: { $gte: new Date(`${thisMonth}-01T00:00:00+06:00`) } }),
    Trip.countDocuments({ status: { $in: ["assigned", "sent"] }, date: { $gte: todayStart } }),
  ]);

  const recv = receivable[0]?.total || 0;
  const driverOwed = driverDues.totals.owed;
  const vendorOwed = vendorDues.totals.owed;
  const billsOwed = payable[0]?.total || 0;
  const pay = round2(billsOwed + driverOwed + vendorOwed);
  const cash = round2((cashIn[0]?.total || 0) - (cashOutBills[0]?.total || 0) - (cashOutLedger[0]?.total || 0) - (cashOutExpenses[0]?.total || 0));

  const incomeMap = Object.fromEntries(incomeByMonth.map((r) => [r._id, r.total]));
  const expenseMap = Object.fromEntries(expenseByMonth.map((r) => [r._id, r.total]));
  const trend = months.map((m) => ({ month: m, income: round2(incomeMap[m] || 0), expense: round2(expenseMap[m] || 0) }));
  const now = trend[trend.length - 1];

  const status = Object.fromEntries(tripStatus.map((r) => [r._id, r.count]));

  const transactions = [
    ...payIn.map((p) => ({ direction: "in", title: p.name || "Client", ref: p.invoiceNo, amount: p.amount, date: p.date, method: p.method })),
    ...payOut.map((p) => ({ direction: "out", title: p.name || "Vendor", ref: p.invoiceNo, amount: p.amount, date: p.date, method: p.method })),
    ...ledgerPays.map((e) => ({ direction: "out", title: e.driver?.name || e.vendor?.name || "Payment", ref: e.party === "driver" ? "Driver payment" : "Vendor payment", amount: -e.delta, date: e.date, method: e.method })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  res.json({
    cards: {
      receivable: { total: recv, count: receivable[0]?.count || 0 },
      payable: { total: pay, bills: billsOwed, driverDues: driverOwed, vendorDues: vendorOwed, count: payable[0]?.count || 0 },
      cash,
      net: round2(cash + recv - pay),
      activeTrips: (status.assigned || 0) + (status.sent || 0),
      newRequests: status.requested || 0,
      completedTrips: completedMonth,
      upcomingTrips: upcoming,
      pendingMaintenance: pendingMaint,
      monthIncome: now.income,
      monthExpense: now.expense,
      overdueInvoices: overdueCount,
    },
    trend,
    expenseByCategory: expenseByCategory
      .map((r) => ({ category: r._id, label: EXPENSE_CATEGORIES[r._id] || r._id, total: r.total }))
      .sort((a, b) => b.total - a.total),
    tripStatus: status,
    payableBills: payableList,
    receivableInvoices: receivableList,
    transactions,
    expenses: expenseList,
    total: { expenseThisMonth: sum(expenseByCategory) },
  });
};
