// Purchase, Inventory, Accounting and Banking reports. Pure functions, same shape as builders.js:
//   { layout, summary, groups: [{ heading, meta, columns, rows, totals }], notices }
const col = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const sum = (rows, key) => round2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));
const totalsFor = (columns, rows) => Object.fromEntries(columns.filter((c) => c.sum).map((c) => [c.key, sum(rows, c.key)]));
const money = (label, value) => ({ label, value: round2(value), type: "money2" });
const count = (label, value) => ({ label, value, type: "number" });
const STATUS = { unpaid: "Unpaid", partial: "Partial", paid: "Paid" };
const ACCOUNT_TYPE = { cash: "Cash drawer", bank: "Bank", mobile: "Mobile banking", card: "Credit card" };
const METHOD = { cash: "Cash", bank_transfer: "Bank transfer", cheque: "Cheque", bkash: "bKash", nagad: "Nagad", card: "Card", other: "Other" };

function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// ---------------------------------------------------------------- Purchase
// 1. Supplier-wise list of purchases in the period
export function purchaseSummary(purchases) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("date", "Date", "date", { weight: 1 }),
    col("purchaseNo", "Purchase no.", "text", { weight: 1.3 }),
    col("refNo", "Reference", "text", { weight: 1.2 }),
    col("total", "Total", "money2", { sum: true, weight: 1.2 }),
    col("paid", "Paid", "money2", { sum: true, weight: 1.2 }),
    col("due", "Due", "money2", { sum: true, weight: 1.2 }),
    col("status", "Status", "text", { weight: 0.9 }),
  ];
  const groups = [...groupBy(purchases, (p) => p.vendor?.name || "Unknown supplier").entries()]
    .map(([heading, list]) => {
      const rows = list.map((p, i) => ({
        sn: i + 1, date: p.date, purchaseNo: p.purchaseNo, refNo: p.refNo || "-",
        total: p.grandTotal, paid: p.paidAmount, due: p.balance, status: STATUS[p.status] || p.status,
      }));
      return { heading, meta: [], columns, rows, totals: totalsFor(columns, rows) };
    })
    .sort((a, b) => a.heading.localeCompare(b.heading));
  return {
    layout: "portrait",
    summary: purchases.length
      ? [
          count("Purchases", purchases.length),
          money("Total", sum(purchases.map((p) => ({ v: p.grandTotal })), "v")),
          money("Paid", sum(purchases.map((p) => ({ v: p.paidAmount })), "v")),
          money("Due", sum(purchases.map((p) => ({ v: p.balance })), "v")),
        ]
      : [],
    groups,
    notices: ["Draft and cancelled purchases are not included."],
  };
}

// 2. What was bought: item-wise quantity and amount
export function purchaseItems(purchases) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("item", "Item", "text", { weight: 3 }),
    col("times", "Times bought", "number", { weight: 1 }),
    col("qty", "Quantity", "number", { sum: true, weight: 1 }),
    col("avgRate", "Average rate", "money2", { weight: 1.2 }),
    col("amount", "Amount", "money2", { sum: true, weight: 1.3 }),
  ];
  const lines = purchases.flatMap((p) => p.items);
  const rows = [...groupBy(lines, (l) => l.name.trim().toLowerCase()).values()]
    .map((list) => {
      const qty = sum(list, "quantity");
      const amount = sum(list, "lineTotal");
      return { item: list[0].name, times: list.length, qty, avgRate: qty ? round2(amount / qty) : 0, amount };
    })
    .sort((a, b) => b.amount - a.amount)
    .map((r, i) => ({ sn: i + 1, ...r }));
  const totals = totalsFor(columns, rows);
  return {
    layout: "portrait",
    summary: rows.length ? [count("Different items", rows.length), money("Item amount", totals.amount)] : [],
    groups: rows.length ? [{ heading: null, columns, rows, totals }] : [],
    notices: ["Amounts are the item lines. Invoice-level discount, VAT and other charges are not included."],
  };
}

// ---------------------------------------------------------------- Inventory
const stockState = (i) => (i.currentStock <= 0 ? "Out of stock" : i.minStock > 0 && i.currentStock <= i.minStock ? "Low" : "OK");

// 1. Stock status and value, by category
export function stockStatus(items) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("name", "Item", "text", { weight: 2.6 }),
    col("sku", "Code", "text", { weight: 1 }),
    col("unit", "Unit", "text", { weight: 0.7 }),
    col("stock", "Stock", "number", { weight: 0.9 }),
    col("min", "Alert at", "number", { weight: 0.9 }),
    col("price", "Purchase price", "money2", { weight: 1.2 }),
    col("value", "Stock value", "money2", { sum: true, weight: 1.3 }),
    col("state", "Status", "text", { weight: 1 }),
  ];
  const groups = [...groupBy(items, (i) => i.category?.name || "No category").entries()]
    .map(([heading, list]) => {
      const rows = list
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i, n) => ({
          sn: n + 1, name: i.name, sku: i.sku || "-", unit: i.unit?.shortName || i.unit?.name || "-",
          stock: i.currentStock, min: i.minStock, price: i.purchasePrice,
          value: round2(i.currentStock * i.purchasePrice), state: stockState(i),
        }));
      return { heading, meta: [], columns, rows, totals: totalsFor(columns, rows) };
    })
    .sort((a, b) => a.heading.localeCompare(b.heading));
  const value = groups.reduce((s, g) => s + g.totals.value, 0);
  return {
    layout: "landscape",
    summary: items.length
      ? [
          count("Items", items.length),
          money("Stock value", value),
          count("Low stock", items.filter((i) => stockState(i) === "Low").length),
          count("Out of stock", items.filter((i) => stockState(i) === "Out of stock").length),
        ]
      : [],
    groups,
    notices: ["This is the stock as it is today, so the period above does not change it. Value = stock x purchase price. Active items only."],
  };
}

// 2. Items at or below their alert level, with a rough cost to refill
export function lowStock(items) {
  const low = items.filter((i) => i.minStock > 0 && i.currentStock <= i.minStock);
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("name", "Item", "text", { weight: 2.6 }),
    col("category", "Category", "text", { weight: 1.5 }),
    col("unit", "Unit", "text", { weight: 0.7 }),
    col("stock", "Stock", "number", { weight: 0.9 }),
    col("min", "Alert at", "number", { weight: 0.9 }),
    col("short", "Short by", "number", { weight: 0.9 }),
    col("cost", "Cost to refill", "money2", { sum: true, weight: 1.3 }),
  ];
  const rows = low
    .sort((a, b) => a.currentStock - a.minStock - (b.currentStock - b.minStock))
    .map((i, n) => ({
      sn: n + 1, name: i.name, category: i.category?.name || "-", unit: i.unit?.shortName || "-",
      stock: i.currentStock, min: i.minStock, short: round2(i.minStock - i.currentStock),
      cost: round2((i.minStock - i.currentStock) * i.purchasePrice),
    }));
  return {
    layout: "landscape",
    summary: rows.length ? [count("Items to refill", rows.length), money("Cost to refill", sum(rows, "cost"))] : [],
    groups: rows.length ? [{ heading: null, columns, rows, totals: totalsFor(columns, rows) }] : [],
    notices: ["As of today. Cost to refill = (alert level - stock) x purchase price, only to get back to the alert level."],
  };
}

// ---------------------------------------------------------------- Accounting and Banking
// txs: every transaction dated before the end of the period; accounts: the accounts to show
const delta = (t, id) => {
  if (t.type === "in") return String(t.account) === id ? t.amount : 0;
  if (t.type === "out") return String(t.account) === id ? -t.amount : 0;
  return (String(t.toAccount) === id ? t.amount : 0) - (String(t.account) === id ? t.amount : 0);
};

function accountFigures(a, txs, range) {
  const id = String(a._id);
  let opening = a.openingBalance || 0;
  let cashIn = 0;
  let cashOut = 0;
  for (const t of txs) {
    const d = delta(t, id);
    if (d === 0) continue;
    if (t.date < range.start) opening += d;
    else if (t.date < range.end) d > 0 ? (cashIn += d) : (cashOut -= d);
  }
  return { opening: round2(opening), cashIn: round2(cashIn), cashOut: round2(cashOut), closing: round2(opening + cashIn - cashOut) };
}

// 1. Account summary: opening, in, out and closing for every account (a trial balance of the money accounts)
export function accountSummary({ accounts, txs, range }) {
  const columns = [
    col("sn", "SN", "number", { weight: 0.5 }),
    col("name", "Account", "text", { weight: 2.2 }),
    col("type", "Type", "text", { weight: 1.3 }),
    col("opening", "Opening", "money2", { sum: true, weight: 1.3 }),
    col("cashIn", "Cash in (Dr)", "money2", { sum: true, weight: 1.3 }),
    col("cashOut", "Cash out (Cr)", "money2", { sum: true, weight: 1.3 }),
    col("closing", "Closing", "money2", { sum: true, weight: 1.3 }),
  ];
  const rows = accounts.map((a, i) => ({ sn: i + 1, name: a.name, type: ACCOUNT_TYPE[a.type], ...accountFigures(a, txs, range) }));
  const totals = totalsFor(columns, rows);
  return {
    layout: "portrait",
    summary: rows.length
      ? [money("Opening", totals.opening), money("Cash in", totals.cashIn), money("Cash out", totals.cashOut), money("Closing", totals.closing)]
      : [],
    groups: rows.length ? [{ heading: null, columns, rows, totals }] : [],
    notices: [
      "Closing = opening + cash in - cash out. A transfer between two accounts shows as cash out of one and cash in of the other, so it does not change the total.",
      "This covers the accounts in Banking. Receivables, payables and stock are not part of it.",
    ],
  };
}

// 2. Cash flow: where the money came from and where it went, in the period (transfers shown apart)
export function cashFlow({ txs, range }) {
  const inRange = txs.filter((t) => t.date >= range.start && t.date < range.end);
  const flow = (type, keyOf) => {
    const rows = [...groupBy(inRange.filter((t) => t.type === type), keyOf).entries()]
      .map(([name, list]) => ({ name, entries: list.length, amount: sum(list, "amount") }))
      .sort((a, b) => b.amount - a.amount);
    return rows;
  };
  const columns = [
    col("name", "", "text", { weight: 3 }),
    col("entries", "Entries", "number", { sum: true, weight: 1 }),
    col("amount", "Amount", "money2", { sum: true, weight: 1.4 }),
  ];
  const mk = (heading, label, rows) => ({
    heading, meta: [], columns: columns.map((c) => (c.key === "name" ? { ...c, label } : c)), rows, totals: totalsFor(columns, rows),
  });
  const ins = flow("in", (t) => t.source || "Other");
  const outs = flow("out", (t) => t.category || "Other");
  const moved = sum(inRange.filter((t) => t.type === "transfer"), "amount");
  const totalIn = sum(ins, "amount");
  const totalOut = sum(outs, "amount");
  const groups = [];
  if (ins.length) groups.push(mk("Cash in", "Source", ins));
  if (outs.length) groups.push(mk("Cash out", "Category", outs));
  return {
    layout: "portrait",
    summary: inRange.length ? [money("Cash in", totalIn), money("Cash out", totalOut), money("Net", totalIn - totalOut), money("Transferred", moved)] : [],
    groups,
    notices: ["Transfers between accounts are left out of cash in and cash out; the transferred total is shown only for information."],
  };
}

// 3. Bank statement: every entry of an account with a running balance
export function balanceStatement({ accounts, txs, range }) {
  const names = new Map(accounts.map((a) => [String(a._id), a.name]));
  const columns = [
    col("date", "Date", "date", { weight: 1 }),
    col("ref", "Voucher / ref", "text", { weight: 1.2 }),
    col("details", "Details", "text", { weight: 2.6 }),
    col("method", "Method", "text", { weight: 1 }),
    col("cashIn", "Cash in", "money2", { sum: true, weight: 1.2 }),
    col("cashOut", "Cash out", "money2", { sum: true, weight: 1.2 }),
    col("balance", "Balance", "money2", { weight: 1.3 }),
  ];
  const groups = accounts.map((a) => {
    const id = String(a._id);
    const f = accountFigures(a, txs, range);
    let run = f.opening;
    const rows = [{ date: range.start, ref: "", details: "Opening balance", method: "", cashIn: null, cashOut: null, balance: f.opening }];
    const mine = txs
      .filter((t) => t.date >= range.start && t.date < range.end && delta(t, id) !== 0)
      .sort((x, y) => x.date - y.date || x.createdAt - y.createdAt);
    for (const t of mine) {
      const d = delta(t, id);
      run = round2(run + d);
      const other = names.get(String(String(t.account) === id ? t.toAccount : t.account)) || "another account";
      const what =
        t.type === "in" ? `Deposit: ${t.source || "Other"}`
        : t.type === "out" ? `Payment: ${[t.category, t.payee].filter(Boolean).join(" - ")}`
        : d > 0 ? `Transfer from ${other}` : `Transfer to ${other}`;
      rows.push({
        date: t.date,
        ref: [t.voucherNo, t.transactionId].filter(Boolean).join(" / ") || "-",
        details: t.description ? `${what} (${t.description})` : what,
        method: METHOD[t.method] || "-",
        cashIn: d > 0 ? d : null,
        cashOut: d < 0 ? -d : null,
        balance: run,
      });
    }
    rows.push({ date: null, ref: "", details: "Closing balance", method: "", cashIn: null, cashOut: null, balance: f.closing });
    return {
      heading: a.name,
      meta: [[ACCOUNT_TYPE[a.type], a.accountNo].filter(Boolean).join(" · ")],
      columns,
      rows,
      totals: totalsFor(columns, rows),
    };
  });
  return {
    layout: "portrait",
    summary: accounts.length ? [count("Accounts", accounts.length)] : [],
    groups,
    notices: ["Choose one bank account to get its own statement. With none chosen, every bank, mobile banking and card account is listed."],
  };
}