import Trip from "../../models/Trip.js";
import Expense from "../../models/Expense.js";
import Car from "../../models/Car.js";
import Client from "../../models/Client.js";
import Purchase from "../../models/Purchase.js";
import InventoryItem from "../../models/InventoryItem.js";
import Account from "../../models/Account.js";
import Transaction from "../../models/Transaction.js";
import { accountSummary, balanceStatement, cashFlow, lowStock, purchaseItems, purchaseSummary, stockStatus } from "./moreBuilders.js";
import { carLabel, customerInvoice, expenseByVehicle, incomeExpense, tripBill, vehicleDepositExpense } from "./builders.js";

const TRIP_POPULATE = [
  { path: "client", select: "name type address phone" },
  { path: "vendor", select: "name companyName" },
  { path: "car", select: "companyName model registrationNo" },
];
const CAR_POPULATE = { path: "car", select: "companyName model registrationNo" };

const inRange = (range) => ({ $gte: range.start, $lt: range.end });

// completed trips only: those are the ones that have been earned
const loadTrips = ({ range, vehicle, customer }) =>
  Trip.find({
    status: "completed",
    date: inRange(range),
    ...(vehicle && { car: vehicle }),
    ...(customer && { client: customer }),
  })
    .populate(TRIP_POPULATE)
    .sort({ date: 1, tripNo: 1 })
    .lean();

const loadExpenses = ({ range, vehicle, category }) =>
  Expense.find({
    isActive: true,
    date: inRange(range),
    ...(vehicle && { car: vehicle }),
    ...(category && { category }),
  })
    .populate(CAR_POPULATE)
    .sort({ date: 1 })
    .lean();

// confirmed purchases only (not draft, not cancelled), by purchase date
const loadPurchases = ({ range }) =>
  Purchase.find({ status: { $in: ["unpaid", "partial", "paid"] }, date: inRange(range) })
    .populate("vendor", "name")
    .sort({ date: 1, purchaseNo: 1 })
    .lean();

const loadItems = () =>
  InventoryItem.find({ isActive: true })
    .populate("category", "name")
    .populate("unit", "name shortName")
    .lean();

// money accounts and every transaction up to the end of the period
const loadAccounts = ({ account, banking }) =>
  Account.find({ ...(account ? { _id: account } : banking ? { type: { $ne: "cash" } } : {}) })
    .sort({ createdAt: 1 })
    .lean();
const loadTxs = ({ range }) => Transaction.find({ date: { $lt: range.end } }).lean();

export const REPORTS = {
  trip: {
    trip_bill: { title: "Trip-wise Supplier & Client Bill", run: async (c) => tripBill(await loadTrips(c)) },
  },
  customer: {
    customer_invoice: { title: "Customer Invoice", run: async (c) => customerInvoice(await loadTrips(c)) },
  },
  vehicle: {
    vehicle_deposit_expense: {
      title: "Trip-wise Deposit & Expense",
      run: async (c) => vehicleDepositExpense(await loadTrips(c)),
    },
  },
  expense: {
    vehicle_expense: { title: "Vehicle-wise Expense", run: async (c) => expenseByVehicle(await loadExpenses(c)) },
  },
  maintenance: {
    vehicle_maintenance: {
      title: "Vehicle-wise Maintenance",
      run: async (c) => expenseByVehicle(await loadExpenses({ ...c, category: "maintenance" })),
    },
  },
  purchase: {
    purchase_summary: { title: "Purchase Summary", run: async (c) => purchaseSummary(await loadPurchases(c)) },
    purchase_items: { title: "Item-wise Purchase", run: async (c) => purchaseItems(await loadPurchases(c)) },
  },
  inventory: {
    stock_status: { title: "Stock Status", run: async () => stockStatus(await loadItems()) },
    low_stock: { title: "Low Stock", run: async () => lowStock(await loadItems()) },
  },
  accounting: {
    account_summary: {
      title: "Account Summary",
      run: async (c) => accountSummary({ accounts: await loadAccounts({}), txs: await loadTxs(c), range: c.range }),
    },
    cash_flow: { title: "Cash Flow", run: async (c) => cashFlow({ txs: await loadTxs(c), range: c.range }) },
  },
  banking: {
    balance_statement: {
      title: "Bank Balance Statement",
      run: async (c) =>
        balanceStatement({ accounts: await loadAccounts({ account: c.account, banking: true }), txs: await loadTxs(c), range: c.range }),
    },
  },
  income_expense: {
    income_expense: {
      title: "Income Expense",
      run: async (c) => incomeExpense(await loadTrips({ range: c.range }), await loadExpenses({ range: c.range })),
    },
  },
};

// Sections that need data this system does not collect yet. They answer honestly instead of showing made-up numbers.
export const PENDING = {};

async function filterLines({ vehicle, customer, account }) {
  const lines = [];
  if (account) lines.push(`Account: ${(await Account.findById(account).lean())?.name || "unknown"}`);
  if (vehicle) lines.push(`Vehicle: ${carLabel(await Car.findById(vehicle).lean()) || "unknown"}`);
  if (customer) lines.push(`Customer: ${(await Client.findById(customer).lean())?.name || "unknown"}`);
  return lines;
}

export async function runReport(section, type, ctx) {
  const def = REPORTS[section][type];
  const built = await def.run(ctx);
  return {
    section,
    type,
    title: def.title,
    period: ctx.range.label,
    filters: await filterLines(ctx),
    ...built,
  };
}