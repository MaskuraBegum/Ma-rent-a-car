// Pure functions: they turn records into the report shape that both the screen and the PDF use.
//   { layout, style, summary, groups: [{ heading, meta, columns, rows, totals }], notices }
// Column types: text, date, money, number.
import { EXPENSE_CATEGORIES } from "../../models/Expense.js";
import { MONTH_NAMES } from "./period.js";

const col = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const totalsFor = (columns, rows) =>
  Object.fromEntries(columns.filter((c) => c.sum).map((c) => [c.key, sum(rows, c.key)]));
const byLabel = (a, b) => a.heading.localeCompare(b.heading);
const ymKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }).slice(0, 7);

export const carLabel = (c) =>
  c ? `${c.companyName} ${c.model}${c.registrationNo ? ` · ${c.registrationNo}` : ""}` : null;

const tripVehicle = (t) =>
  carLabel(t.car) || [t.vehicleType, t.vendorCarNo].filter(Boolean).join(" · ") || "No vehicle";
const supplierOf = (t) => t.vendor?.name || t.driverName || "-";
const clientOf = (t) => [t.client?.name, t.unitName].filter(Boolean).join(" - ") || "Not linked";

function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// 1. Trip-wise Supplier & Client Bill
export function tripBill(trips) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("date", "Date", "date", { weight: 1 }),
    col("location", "Location", "text", { weight: 2.2 }),
    col("client", "Client / unit", "text", { weight: 2 }),
    col("vehicle", "Vehicle", "text", { weight: 1.6 }),
    col("supplier", "Supplier", "text", { weight: 1.5 }),
    col("clientBill", "Client bill", "money", { sum: true, weight: 1.1 }),
    col("supplierBill", "Supplier bill", "money", { sum: true, weight: 1.1 }),
    col("office", "Office", "money", { sum: true, weight: 1 }),
  ];
  const rows = trips.map((t, i) => ({
    sn: i + 1,
    date: t.date,
    location: t.location,
    client: clientOf(t),
    vehicle: tripVehicle(t),
    supplier: supplierOf(t),
    clientBill: t.rent,
    supplierBill: t.ownerAmount,
    office: t.officeAmount,
  }));
  const totals = totalsFor(columns, rows);
  return {
    layout: "landscape",
    summary: rows.length
      ? [
          { label: "Trips", value: rows.length, type: "number" },
          { label: "Client bill", value: totals.clientBill, type: "money" },
          { label: "Supplier bill", value: totals.supplierBill, type: "money" },
          { label: "Office share", value: totals.office, type: "money" },
        ]
      : [],
    groups: rows.length ? [{ heading: null, columns, rows, totals }] : [],
    notices: ["Only completed trips are included. Supplier is the vendor, or the driver when there is no vendor."],
  };
}

// 2. Customer invoice: one invoice (duty chart) per client
export function customerInvoice(trips) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("date", "Date", "date", { weight: 1.1 }),
    col("location", "Location", "text", { weight: 2.5 }),
    col("vehicle", "Vehicle", "text", { weight: 1.5 }),
    col("driver", "Driver", "text", { weight: 1.3 }),
    col("time", "Time", "text", { weight: 1.3 }),
    col("hours", "Hours", "number", { weight: 0.7 }),
    col("rent", "Rent", "money", { sum: true, weight: 1.1 }),
  ];
  const groups = [...groupBy(trips, (t) => (t.client ? String(t.client._id) : "none")).values()]
    .map((list) => {
      const c = list[0].client;
      const rows = list.map((t, i) => ({
        sn: i + 1,
        date: t.date,
        location: `${t.unitName ? `${t.unitName} - ` : ""}${t.location}`,
        vehicle: tripVehicle(t),
        driver: t.driverName || "-",
        time: [t.startTime, t.finishTime].filter(Boolean).join(" - ") || "-",
        hours: t.totalHours,
        rent: t.rent,
      }));
      return {
        heading: c?.name || "Not linked",
        meta: [c?.address, c?.phone ? `+${c.phone}` : null].filter(Boolean),
        columns,
        rows,
        totals: totalsFor(columns, rows),
      };
    })
    .sort(byLabel);

  return {
    layout: "portrait",
    style: "invoice",
    summary: groups.length
      ? [
          { label: "Invoices", value: groups.length, type: "number" },
          { label: "Total amount", value: groups.reduce((s, g) => s + g.totals.rent, 0), type: "money" },
        ]
      : [],
    groups,
    notices: [
      "Only completed trips are included.",
      "Previous dues and the last payment are not on the invoice yet. They will be added when payments are recorded.",
    ],
  };
}

// 3. Trip-wise deposit and expense, grouped by vehicle
export function vehicleDepositExpense(trips) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("date", "Date", "date", { weight: 1 }),
    col("tripNo", "Trip", "number", { weight: 0.6 }),
    col("location", "Location", "text", { weight: 2.2 }),
    col("client", "Client / unit", "text", { weight: 2 }),
    col("deposit", "Deposit", "money", { sum: true, weight: 1.1 }),
    col("expense", "Expense", "money", { sum: true, weight: 1.1 }),
    col("balance", "Balance", "money", { sum: true, weight: 1.1 }),
  ];
  const groups = [...groupBy(trips, tripVehicle).entries()]
    .map(([label, list]) => {
      const rows = list.map((t, i) => ({
        sn: i + 1,
        date: t.date,
        tripNo: t.tripNo,
        location: t.location,
        client: clientOf(t),
        deposit: t.rent,
        expense: t.ownerAmount,
        balance: t.officeAmount,
      }));
      const owner = list[0].vendor?.name;
      return {
        heading: label,
        meta: [owner ? `Owner: ${owner}` : null].filter(Boolean),
        columns,
        rows,
        totals: totalsFor(columns, rows),
      };
    })
    .sort(byLabel);

  const all = groups.flatMap((g) => g.rows);
  return {
    layout: "landscape",
    summary: all.length
      ? [
          { label: "Total deposit", value: sum(all, "deposit"), type: "money" },
          { label: "Total expense", value: sum(all, "expense"), type: "money" },
          { label: "Balance", value: sum(all, "balance"), type: "money" },
        ]
      : [],
    groups,
    notices: [
      "Deposit is the trip rent. Expense is the owner / vendor share paid out. Fuel, repairs and other costs are in the Expense report.",
    ],
  };
}

// 4 and 7. Expenses grouped by vehicle (all categories, or only maintenance)
export function expenseByVehicle(expenses) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("date", "Date", "date", { weight: 1 }),
    col("category", "Category", "text", { weight: 1.2 }),
    col("description", "Description", "text", { weight: 3.5 }),
    col("amount", "Amount", "money", { sum: true, weight: 1.2 }),
  ];
  const groups = [...groupBy(expenses, (e) => carLabel(e.car) || "General (no vehicle)").entries()]
    .map(([label, list]) => {
      const rows = list.map((e, i) => ({
        sn: i + 1,
        date: e.date,
        category: EXPENSE_CATEGORIES[e.category] || e.category,
        description: e.description || "-",
        amount: e.amount,
      }));
      return { heading: label, columns, rows, totals: totalsFor(columns, rows) };
    })
    .sort(byLabel);

  const all = groups.flatMap((g) => g.rows);
  return {
    layout: "portrait",
    summary: all.length
      ? [
          { label: "Entries", value: all.length, type: "number" },
          { label: "Total expense", value: sum(all, "amount"), type: "money" },
        ]
      : [],
    groups,
    notices: [],
  };
}

// 10. Income and expense statement
export function incomeExpense(trips, expenses) {
  const income = sum(trips, "rent");
  const ownerShare = sum(trips, "ownerAmount");
  const other = sum(expenses, "amount");

  const columns = [
    col("item", "Item", "text", { weight: 4 }),
    col("income", "Income", "money", { sum: true, weight: 1.5 }),
    col("expense", "Expense", "money", { sum: true, weight: 1.5 }),
  ];
  const rows = [
    { item: `Trip income (${trips.length} completed trips)`, income, expense: null },
    { item: "Owner / vendor share paid", income: null, expense: ownerShare },
  ];
  for (const [key, label] of Object.entries(EXPENSE_CATEGORIES)) {
    const amount = sum(expenses.filter((e) => e.category === key), "amount");
    if (amount > 0) rows.push({ item: label, income: null, expense: amount });
  }
  const groups = [
    { heading: "Statement", columns, rows, totals: { income, expense: ownerShare + other } },
  ];

  // month by month, when the period covers more than one month
  const months = new Map();
  const bucket = (d) => {
    const k = ymKey(d);
    if (!months.has(k)) months.set(k, { income: 0, owner: 0, other: 0 });
    return months.get(k);
  };
  for (const t of trips) {
    const b = bucket(t.date);
    b.income += t.rent || 0;
    b.owner += t.ownerAmount || 0;
  }
  for (const e of expenses) bucket(e.date).other += e.amount || 0;

  if (months.size > 1) {
    const mcols = [
      col("month", "Month", "text", { weight: 2 }),
      col("income", "Income", "money", { sum: true }),
      col("owner", "Owner share", "money", { sum: true }),
      col("other", "Other expense", "money", { sum: true }),
      col("net", "Net", "money", { sum: true }),
    ];
    const mrows = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        month: `${MONTH_NAMES[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`,
        income: v.income,
        owner: v.owner,
        other: v.other,
        net: v.income - v.owner - v.other,
      }));
    groups.push({ heading: "Month by month", columns: mcols, rows: mrows, totals: totalsFor(mcols, mrows) });
  }

  return {
    layout: "portrait",
    summary: [
      { label: "Total income", value: income, type: "money" },
      { label: "Total expense", value: ownerShare + other, type: "money" },
      { label: "Net profit", value: income - ownerShare - other, type: "money" },
    ],
    groups,
    notices: ["Income is the rent of completed trips. Expenses are the owner / vendor share plus the costs added on the Expenses page."],
  };
}
