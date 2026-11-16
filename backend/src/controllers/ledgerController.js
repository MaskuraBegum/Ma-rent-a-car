import LedgerEntry from "../models/LedgerEntry.js";
import { LEDGER_TYPES, ledgerStatement, partyBalances, partyModel } from "../services/ledgerService.js";
import { renderPdf } from "../services/reports/pdf.js";
import { fmtDay } from "../services/reports/period.js";
import { round2 } from "../services/invoiceMath.js";

const bad = (res, message, code = 400) => res.status(code).json({ message });
const day = /^\d{4}-\d{2}-\d{2}$/;
const word = (type) => (type === "driver" ? "Driver" : "Vendor");

async function loadParty(req, res) {
  const { type, id } = req.params;
  if (!LEDGER_TYPES.includes(type)) return bad(res, "Route not found", 404);
  const party = await partyModel(type).findById(id).lean();
  if (!party) return bad(res, `${word(type)} not found`, 404);
  return party;
}

export const balances = async (req, res) => {
  if (!LEDGER_TYPES.includes(req.params.type)) return bad(res, "Route not found", 404);
  res.json(await partyBalances(req.params.type));
};

export const partyLedger = async (req, res) => {
  const party = await loadParty(req, res);
  if (!party.name) return; // loadParty already answered
  const { from, to, format } = req.query;
  if ((from && !day.test(from)) || (to && !day.test(to))) return bad(res, "Use dates like 2026-11-30");
  if (from && to && to < from) return bad(res, "The to date is before the from date");

  const stmt = await ledgerStatement(req.params.type, party, { from, to });
  if (format !== "pdf") return res.json(stmt);

  // the same statement as a PDF
  const col = (key, label, type, extra = {}) => ({ key, label, type, ...extra });
  const columns = [
    col("date", "Date", "date", { weight: 1.1 }),
    col("particulars", "Particulars", "text", { weight: 3.4 }),
    col("earned", "Earned", "money2", { sum: true, weight: 1.3 }),
    col("paid", "Paid", "money2", { sum: true, weight: 1.3 }),
    col("balance", "Balance", "money2", { weight: 1.3 }),
  ];
  const rows = [...(from ? [{ date: new Date(`${from}T00:00:00+06:00`), particulars: "Balance brought forward", balance: stmt.opening }] : []), ...stmt.rows];
  const label = from || to ? `${from ? fmtDay(`${from}T00:00:00+06:00`) : "Start"} to ${to ? fmtDay(`${to}T00:00:00+06:00`) : "today"}` : "All dates";
  const report = {
    layout: "portrait",
    title: `${word(req.params.type)} account statement`,
    period: label,
    filters: [`${word(req.params.type)}: ${party.name}`],
    summary: [
      { label: "Opening balance", value: stmt.opening, type: "money2" },
      { label: "Earned", value: stmt.earned, type: "money2" },
      { label: "Paid", value: stmt.paid, type: "money2" },
      { label: stmt.closing < 0 ? "Paid ahead" : "We owe", value: Math.abs(stmt.closing), type: "money2" },
    ],
    groups: [{ heading: party.name, meta: [party.phone ? `+${party.phone}` : null].filter(Boolean), columns, rows, totals: { earned: stmt.earned, paid: stmt.paid } }],
    notices: [],
  };
  renderPdf(report, res, `${req.params.type}-ledger-${party.name}.pdf`.toLowerCase().replace(/[^a-z0-9.]+/g, "-"));
};

export const addEntry = async (req, res) => {
  const party = await loadParty(req, res);
  if (!party.name) return;
  const { type } = req.params;
  const b = req.body;

  if (b.kind === "payment" && b.amount < 0) return bad(res, "A payment must be more than zero");
  if (b.kind === "adjustment" && !b.note) return bad(res, "Write a note for the adjustment");
  if (b.kind === "opening" && (await LedgerEntry.exists({ party: type, [type]: party._id, kind: "opening" }))) {
    return bad(res, "This account already has an opening balance. Delete it first if it is wrong");
  }

  const entry = await LedgerEntry.create({
    party: type,
    [type]: party._id,
    kind: b.kind,
    date: b.date,
    delta: round2(b.kind === "payment" ? -b.amount : b.amount),
    method: b.kind === "payment" ? b.method || "cash" : undefined,
    note: b.note,
  });
  res.status(201).json(entry);
};

export const deleteEntry = async (req, res) => {
  const entry = await LedgerEntry.findById(req.params.entryId);
  if (!entry) return bad(res, "Entry not found", 404);
  if (entry.kind === "duty") return bad(res, "This line comes from a trip. Change the trip instead");
  await LedgerEntry.deleteOne({ _id: entry._id });
  res.json({ deleted: true });
};