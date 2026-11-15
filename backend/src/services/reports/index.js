import Trip from "../../models/Trip.js";
import Expense from "../../models/Expense.js";
import Car from "../../models/Car.js";
import Client from "../../models/Client.js";
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
  income_expense: {
    income_expense: {
      title: "Income Expense",
      run: async (c) => incomeExpense(await loadTrips({ range: c.range }), await loadExpenses({ range: c.range })),
    },
  },
};

// Sections that need data this system does not collect yet. They answer honestly instead of showing made-up numbers.
export const PENDING = {
  purchase: { message: "The Purchase report needs a Purchases module (shop bills and payments). It is not built yet." },
  inventory: { message: "The Inventory report needs an Inventory module (parts and stock). It is not built yet." },
  accounting: { message: "The Accounting report needs the Ledger and payments. They are not built yet." },
  banking: { message: "The Banking report needs Bank accounts and their transactions. They are not built yet." },
};

async function filterLines({ vehicle, customer }) {
  const lines = [];
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
