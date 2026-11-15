import Invoice, { ISSUED_STATUSES } from "../models/Invoice.js";
import Client from "../models/Client.js";
import Vendor from "../models/Vendor.js";
import Trip from "../models/Trip.js";
import { checkInvoice, computeInvoice, round2 } from "../services/invoiceMath.js";
import { buildStatement } from "../services/statement.js";
import { renderInvoicePdf } from "../services/invoicePdf.js";
import { renderPdf } from "../services/reports/pdf.js";
import { fmtDay } from "../services/reports/period.js";

const PREFIX = { client: "INV", vendor: "BILL" };
const DHAKA = "Asia/Dhaka";
const bad = (res, message, code = 400) => res.status(code).json({ message });
const notFound = (res) => res.status(404).json({ message: "Invoice not found" });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dayStart = (iso) => new Date(`${iso}T00:00:00+06:00`);
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: DHAKA });
const yearOf = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: DHAKA }).slice(0, 4);
const partyField = (type) => (type === "client" ? "client" : "vendor");

// next free number, like INV-2026-0001 (BILL-2026-0001 for vendor bills)
async function nextInvoiceNo(type, date) {
  const prefix = `${PREFIX[type]}-${yearOf(date)}-`;
  const used = await Invoice.find({ type, invoiceNo: new RegExp(`^${escapeRegex(prefix)}\\d+$`) }).select("invoiceNo").lean();
  const max = used.reduce((m, x) => Math.max(m, Number(x.invoiceNo.slice(prefix.length))), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function loadParty(type, partyId, unitId) {
  if (type === "client") {
    const c = await Client.findById(partyId);
    if (!c) return { error: "Client not found" };
    const unit = unitId ? c.units.id(unitId) : null;
    if (unitId && !unit) return { error: "This unit does not belong to the client" };
    return {
      refs: { client: c._id, vendor: null },
      unit,
      billTo: { name: c.name, address: unit?.address || c.address, phone: unit?.phone || c.phone, unitName: unit?.name },
    };
  }
  const v = await Vendor.findById(partyId);
  if (!v) return { error: "Vendor not found" };
  return {
    refs: { vendor: v._id, client: null },
    unit: null,
    billTo: { name: v.companyName ? `${v.name} (${v.companyName})` : v.name, phone: v.phone },
  };
}

// every trip on an invoice line must be completed, belong to the party and not be billed twice
async function checkTrips(type, partyId, items, ownId) {
  const ids = items.map((i) => i.trip).filter(Boolean).map(String);
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return "The same trip is added twice";
  const trips = await Trip.find({ _id: { $in: ids } }).select("tripNo status client vendor").lean();
  if (trips.length !== ids.length) return "A trip in the items was not found";
  for (const t of trips) {
    if (t.status !== "completed") return `Trip #${t.tripNo} is not completed`;
    if (String(t[partyField(type)]) !== String(partyId)) return `Trip #${t.tripNo} belongs to someone else`;
  }
  const used = await Invoice.find({
    type, status: { $ne: "cancelled" }, tripIds: { $in: ids }, ...(ownId && { _id: { $ne: ownId } }),
  }).select("invoiceNo tripIds").lean();
  if (used.length) {
    const t = trips.find((x) => used[0].tripIds.map(String).includes(String(x._id)));
    return `Trip #${t?.tripNo} is already on ${used[0].invoiceNo}`;
  }
  return null;
}

const todayStart = () => dayStart(todayIso());
const pastDue = (dueDate) => new Date(dueDate) < todayStart();

// the payments decide Partial and Paid. With no payments the status stays as it was set
function settle(inv) {
  inv.paidAmount = round2(inv.payments.reduce((s, p) => s + p.amount, 0));
  inv.balance = round2(inv.grandTotal - inv.paidAmount);
  if (ISSUED_STATUSES.includes(inv.status)) {
    if (inv.paidAmount <= 0) {
      if (["partial", "paid"].includes(inv.status)) inv.status = "unpaid"; // payments were removed
    } else {
      inv.status = inv.balance <= 0 ? "paid" : "partial";
    }
  }
}

// Status Partial or Paid chosen on the form: record the money received. Returns an error message or null
function recordReceived(inv, status, received, fallbackDate) {
  const amount = status === "paid" ? inv.grandTotal : received?.amount;
  if (!amount) return "Enter the amount received";
  if (status === "partial" && amount >= inv.grandTotal) return "A partial payment must be less than the total. Choose Paid instead";
  if (round2(inv.paidAmount + amount) > inv.grandTotal) return "The payment is more than the total";
  inv.payments.push({ date: received?.date ?? fallbackDate, amount, method: received?.method || "cash" });
  settle(inv);
  return null;
}

// works out the totals and stores them. Returns an error message or null
function applyAmounts(inv, { items, discount, vatPercent, otherCharges }) {
  const calc = computeInvoice({ items, discount, vatPercent, otherCharges });
  const err = checkInvoice(items, calc, discount);
  if (err) return err;
  const paid = round2(inv.payments.reduce((s, p) => s + p.amount, 0));
  if (paid > calc.grandTotal) return "The total is less than the payments already received";

  inv.items = calc.lines.map(({ net, ...line }) => line);
  inv.discount = discount;
  inv.vatPercent = vatPercent;
  inv.otherCharges = otherCharges;
  inv.subTotal = calc.subTotal;
  inv.vatAmount = calc.vatAmount;
  inv.grandTotal = calc.grandTotal;
  inv.tripIds = items.map((i) => i.trip).filter(Boolean);
  settle(inv);
  return null;
}

function changeStatusRules(inv, to) {
  if (to === inv.status) return null;
  const hasPayments = inv.payments.length > 0;
  if (inv.status === "cancelled" && to !== "draft") return "Re-open the invoice as a draft first";
  if (to === "cancelled" && hasPayments) return "This invoice has payments. Delete the payments first, then cancel it";
  if (to === "draft" && hasPayments) return "This invoice has payments, so it cannot go back to draft";
  if (["partial", "paid"].includes(inv.status) && ["sent", "unpaid", "overdue"].includes(to)) return null; // the payments decide
  if (to === "overdue" && !pastDue(inv.dueDate)) return "The estimated payment date has not passed yet, so it is not overdue";
  inv.status = to;
  return null;
}

const plainItems = (inv) =>
  inv.items.map((i) => ({
    name: i.name, description: i.description, quantity: i.quantity, rate: i.rate,
    discount: i.discount || 0, vatPercent: i.vatPercent || 0, trip: i.trip ? String(i.trip) : undefined,
  }));

export const nextNumber = async (req, res) => {
  const { type, date = todayIso() } = req.query;
  if (!PREFIX[type]) return bad(res, "Choose client or vendor");
  res.json({ invoiceNo: await nextInvoiceNo(type, dayStart(date)) });
};

export const createInvoice = async (req, res) => {
  const b = req.body;
  if (b.dueDate < b.invoiceDate) return bad(res, "The estimated payment date cannot be before the invoice date");

  const party = await loadParty(b.type, b.party, b.unitId);
  if (party.error) return bad(res, party.error);
  const tripErr = await checkTrips(b.type, b.party, b.items, null);
  if (tripErr) return bad(res, tripErr);

  const inv = new Invoice({
    type: b.type, ...party.refs, unitId: party.unit?._id, billTo: party.billTo,
    status: b.status || "draft", poNo: b.poNo, invoiceDate: b.invoiceDate, dueDate: b.dueDate, notes: b.notes,
  });
  const err = applyAmounts(inv, {
    items: b.items, discount: b.discount ?? 0, vatPercent: b.vatPercent ?? 0, otherCharges: b.otherCharges ?? 0,
  });
  if (err) return bad(res, err);

  if (b.status === "overdue" && !pastDue(b.dueDate)) return bad(res, "The estimated payment date has not passed yet, so it is not overdue");
  if (["partial", "paid"].includes(b.status)) {
    const receivedErr = recordReceived(inv, b.status, b.received, b.invoiceDate);
    if (receivedErr) return bad(res, receivedErr);
  }

  if (b.invoiceNo && (await Invoice.exists({ type: b.type, invoiceNo: b.invoiceNo }))) {
    return bad(res, "This invoice number is already used", 409);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    inv.invoiceNo = b.invoiceNo || (await nextInvoiceNo(b.type, b.invoiceDate));
    try {
      await inv.save();
      return res.status(201).json(inv);
    } catch (e) {
      // two people saved at the same moment: take the next number
      if (!(e.code === 11000 && !b.invoiceNo)) throw e;
    }
  }
  return bad(res, "Could not get an invoice number. Please try again", 409);
};

export const updateInvoice = async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) return notFound(res);
  if (inv.status === "cancelled") return bad(res, "A cancelled invoice cannot be edited. Re-open it as a draft first");
  const b = req.body;

  const dueDate = b.dueDate ?? inv.dueDate;
  const invoiceDate = b.invoiceDate ?? inv.invoiceDate;
  if (dueDate < invoiceDate) return bad(res, "The estimated payment date cannot be before the invoice date");

  const currentParty = String(inv[partyField(inv.type)]);
  const partyId = b.party ?? currentParty;
  if (b.party || b.unitId !== undefined) {
    if (partyId !== currentParty && inv.payments.length) return bad(res, "This invoice has payments, so the party cannot be changed");
    const party = await loadParty(inv.type, partyId, b.unitId);
    if (party.error) return bad(res, party.error);
    inv.client = party.refs.client;
    inv.vendor = party.refs.vendor;
    inv.unitId = party.unit?._id;
    inv.billTo = party.billTo;
  }

  if (b.invoiceNo && b.invoiceNo !== inv.invoiceNo) {
    if (await Invoice.exists({ type: inv.type, invoiceNo: b.invoiceNo, _id: { $ne: inv._id } })) {
      return bad(res, "This invoice number is already used", 409);
    }
    inv.invoiceNo = b.invoiceNo;
  }
  for (const k of ["poNo", "notes"]) if (b[k] !== undefined) inv[k] = b[k];
  inv.invoiceDate = invoiceDate;
  inv.dueDate = dueDate;

  const items = b.items ?? plainItems(inv);
  if (b.items) {
    const tripErr = await checkTrips(inv.type, partyId, items, inv._id);
    if (tripErr) return bad(res, tripErr);
  }
  const err = applyAmounts(inv, {
    items,
    discount: b.discount ?? inv.discount,
    vatPercent: b.vatPercent ?? inv.vatPercent,
    otherCharges: b.otherCharges ?? inv.otherCharges,
  });
  if (err) return bad(res, err);

  if (b.status) {
    if (["partial", "paid"].includes(b.status)) {
      // with payments already recorded, they decide; otherwise record what was received
      if (inv.payments.length === 0) {
        const receivedErr = recordReceived(inv, b.status, b.received, inv.invoiceDate);
        if (receivedErr) return bad(res, receivedErr);
      }
    } else {
      const statusErr = changeStatusRules(inv, b.status);
      if (statusErr) return bad(res, statusErr);
      settle(inv);
    }
  }
  await inv.save();
  res.json(inv);
};

export const setStatus = async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) return notFound(res);
  const err = changeStatusRules(inv, req.body.status);
  if (err) return bad(res, err);
  settle(inv);
  await inv.save();
  res.json(inv);
};

export const addPayment = async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) return notFound(res);
  if (!ISSUED_STATUSES.includes(inv.status)) return bad(res, "Mark the invoice as sent before adding payments");
  const b = req.body;
  if (round2(inv.paidAmount + b.amount) > inv.grandTotal) {
    return bad(res, `The payment is more than the balance (${inv.balance})`);
  }
  inv.payments.push({ date: b.date, amount: b.amount, method: b.method || "cash", note: b.note });
  settle(inv);
  await inv.save();
  res.status(201).json(inv);
};

export const deletePayment = async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) return notFound(res);
  if (!inv.payments.id(req.params.paymentId)) return bad(res, "Payment not found", 404);
  inv.payments.pull({ _id: req.params.paymentId });
  settle(inv);
  await inv.save();
  res.json(inv);
};

export const getInvoice = async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) return notFound(res);
  res.json(inv);
};

export const invoicePdf = async (req, res) => {
  const inv = await Invoice.findById(req.params.id).lean();
  if (!inv) return notFound(res);
  renderInvoicePdf(inv, res);
};

export const listInvoices = async (req, res) => {
  const { type, status, party, from, to, search, overdue, page = 1, limit = 50 } = req.query;
  if (!PREFIX[type]) return bad(res, "Choose client or vendor");

  const filter = { type };
  if (status) filter.status = { $in: String(status).split(",") };
  if (party) filter[partyField(type)] = party;
  if (from || to) {
    filter.invoiceDate = {};
    if (from) filter.invoiceDate.$gte = dayStart(from);
    if (to) filter.invoiceDate.$lte = dayStart(to);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    filter.$or = [{ invoiceNo: rx }, { poNo: rx }, { "billTo.name": rx }];
  }
  if (overdue === "true") {
    filter.$and = [
      { $or: [{ status: "overdue" }, { status: { $in: ["sent", "unpaid", "partial"] }, dueDate: { $lt: todayStart() } }] },
    ];
  }

  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Number(limit) || 50, 200);
  const [items, total, money] = await Promise.all([
    Invoice.find(filter).select("-items -payments -tripIds").sort({ invoiceDate: -1, createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Invoice.countDocuments(filter),
    Invoice.find(filter).select("status grandTotal paidAmount balance").lean(),
  ]);
  const issued = money.filter((x) => ISSUED_STATUSES.includes(x.status));
  const totals = {
    billed: round2(issued.reduce((s, x) => s + x.grandTotal, 0)),
    paid: round2(issued.reduce((s, x) => s + x.paidAmount, 0)),
    balance: round2(issued.reduce((s, x) => s + x.balance, 0)),
  };
  res.json({ items, total, page: p, limit: l, totals });
};

// item names used before, so the form can suggest them (with the last rate)
export const itemCatalog = async (req, res) => {
  const { type } = req.query;
  if (!PREFIX[type]) return bad(res, "Choose client or vendor");
  const recent = await Invoice.find({ type }).sort({ invoiceDate: -1 }).limit(100).select("items").lean();
  const seen = new Map();
  for (const inv of recent) {
    for (const it of inv.items) {
      const key = it.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, it.trip ? { name: it.name } : { name: it.name, description: it.description, rate: it.rate });
    }
  }
  res.json([...seen.values()].slice(0, 200));
};

// completed trips that are not on an invoice yet: the client's rent, or the vendor's share
export const billableTrips = async (req, res) => {
  const { type, party, unit, from, to, exclude } = req.query;
  if (!PREFIX[type] || !party) return bad(res, "Choose the client or vendor first");

  const billed = await Invoice.find({
    type, status: { $ne: "cancelled" }, ...(exclude && { _id: { $ne: exclude } }),
  }).select("tripIds").lean();
  const skip = billed.flatMap((b) => b.tripIds);

  const filter = { status: "completed", [partyField(type)]: party, _id: { $nin: skip } };
  if (type === "client" && unit) filter.unitId = unit;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = dayStart(from);
    if (to) filter.date.$lte = dayStart(to);
  }
  const trips = await Trip.find(filter).populate({ path: "car", select: "companyName model registrationNo" }).sort({ date: 1, tripNo: 1 }).limit(300).lean();

  res.json(
    trips.map((t) => {
      const vehicle = t.car ? `${t.car.companyName} ${t.car.model}` : [t.vehicleType, t.vendorCarNo].filter(Boolean).join(" ");
      const amount = type === "client" ? t.rent : t.ownerAmount;
      return {
        _id: t._id, tripNo: t.tripNo, date: t.date, location: t.location, unitName: t.unitName, vehicle, amount,
        description: [fmtDay(t.date), t.location, vehicle, t.totalHours ? `${t.totalHours} h` : null].filter(Boolean).join(" · "),
      };
    })
  );
};

export const statement = async (req, res) => {
  const { type, party, format } = req.query;
  if (!PREFIX[type]) return bad(res, "Choose client or vendor");
  const fromIso = req.query.from || `${todayIso().slice(0, 4)}-01-01`;
  const toIso = req.query.to || todayIso();
  const from = dayStart(fromIso);
  const toExclusive = new Date(dayStart(toIso).getTime() + 86400000);
  if (isNaN(from) || isNaN(toExclusive)) return bad(res, "Invalid date");
  if (toExclusive <= from) return bad(res, "The to date is before the from date");

  const invoices = await Invoice.find({
    type, status: { $in: ISSUED_STATUSES }, invoiceDate: { $lt: toExclusive }, ...(party && { [partyField(type)]: party }),
  }).lean();

  const report = buildStatement(invoices, {
    type, from, toExclusive, label: `${fmtDay(from)} to ${fmtDay(dayStart(toIso))}`,
  });
  report.filters = party && invoices[0] ? [`${type === "client" ? "Client" : "Vendor"}: ${invoices[0].billTo?.name}`] : [];

  if (format === "pdf") return renderPdf(report, res, `statement-${type}-${fromIso}-to-${toIso}.pdf`);
  res.json(report);
};
