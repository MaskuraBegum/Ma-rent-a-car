// Statement of invoices and payments per client or vendor, in the same shape the reports use.
import { round2 } from "./invoiceMath.js";

const col = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });
const partyKey = (inv) => String(inv.client || inv.vendor || "none");

export function buildStatement(invoices, { type, from, toExclusive, label }) {
  const isClient = type === "client";
  const columns = [
    col("date", "Date", "date", { weight: 1.1 }),
    col("particulars", isClient ? "Particulars" : "Particulars", "text", { weight: 3.4 }),
    col("billed", isClient ? "Invoiced" : "Billed", "money2", { sum: true, weight: 1.3 }),
    col("paid", isClient ? "Received" : "Paid", "money2", { sum: true, weight: 1.3 }),
    col("balance", isClient ? "Due" : "Payable", "money2", { weight: 1.3 }),
  ];

  const byParty = new Map();
  for (const inv of invoices) {
    const k = partyKey(inv);
    if (!byParty.has(k)) byParty.set(k, []);
    byParty.get(k).push(inv);
  }

  let opening = 0, billed = 0, paid = 0;
  const groups = [...byParty.values()]
    .map((list) => {
      const events = [];
      for (const inv of list) {
        events.push({ date: inv.invoiceDate, order: 0, particulars: `${isClient ? "Invoice" : "Bill"} ${inv.invoiceNo}`, billed: inv.grandTotal, paid: 0 });
        for (const p of inv.payments || []) {
          events.push({
            date: p.date, order: 1,
            particulars: `Payment for ${inv.invoiceNo} (${p.method})${p.note ? ` - ${p.note}` : ""}`,
            billed: 0, paid: p.amount,
          });
        }
      }
      events.sort((a, b) => a.date - b.date || a.order - b.order);

      const before = events.filter((e) => e.date < from);
      const inRange = events.filter((e) => e.date >= from && e.date < toExclusive);
      let running = round2(before.reduce((s, e) => s + e.billed - e.paid, 0));
      const openingBalance = running;

      const rows = [{ date: from, particulars: "Opening balance", billed: null, paid: null, balance: running }];
      for (const e of inRange) {
        running = round2(running + e.billed - e.paid);
        rows.push({ date: e.date, particulars: e.particulars, billed: e.billed || null, paid: e.paid || null, balance: running });
      }
      const totals = {
        billed: round2(inRange.reduce((s, e) => s + e.billed, 0)),
        paid: round2(inRange.reduce((s, e) => s + e.paid, 0)),
      };
      opening += openingBalance; billed += totals.billed; paid += totals.paid;

      const first = list[0];
      return {
        heading: first.billTo?.name || "Not linked",
        meta: [first.billTo?.address, first.billTo?.phone ? `+${first.billTo.phone}` : null].filter(Boolean),
        columns, rows, totals,
        closing: running,
      };
    })
    .sort((a, b) => a.heading.localeCompare(b.heading));

  return {
    layout: "portrait",
    title: isClient ? "Client Statement" : "Vendor Statement",
    period: label,
    summary: groups.length
      ? [
          { label: "Opening balance", value: round2(opening), type: "money2" },
          { label: isClient ? "Invoiced" : "Billed", value: round2(billed), type: "money2" },
          { label: isClient ? "Received" : "Paid", value: round2(paid), type: "money2" },
          { label: isClient ? "Amount due" : "Amount payable", value: round2(opening + billed - paid), type: "money2" },
        ]
      : [],
    groups,
    notices: ["Only invoices that were marked as sent are included. Drafts and cancelled invoices are left out."],
  };
}
