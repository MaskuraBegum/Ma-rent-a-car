import LedgerEntry from "../models/LedgerEntry.js";
import Driver from "../models/Driver.js";
import Vendor from "../models/Vendor.js";
import { round2 } from "./invoiceMath.js";

export const LEDGER_TYPES = ["driver", "vendor"];
export const partyModel = (type) => (type === "driver" ? Driver : Vendor);
const idOf = (e) => String(e.party === "driver" ? e.driver : e.vendor);
const DAY = 86400000;

// Who is paid for a trip: the vendor for a rented car, the driver for a company car.
export const payoutParty = (trip) => {
  if (trip.vehicleSource === "rent") return trip.vendor ? { party: "vendor", vendor: trip.vendor } : null;
  return trip.driver ? { party: "driver", driver: trip.driver } : null;
};

// Keeps the trip's one "duty" line in step with the trip. Call it after every trip save.
// A completed trip with a payout adds to the account. Anything else leaves no line.
export async function syncTripLedger(trip) {
  await LedgerEntry.deleteMany({ trip: trip._id, kind: "duty" });
  const target = trip.status === "completed" && trip.ownerAmount > 0 ? payoutParty(trip) : null;
  if (!target) return null;
  return LedgerEntry.create({
    ...target,
    kind: "duty",
    date: trip.date,
    delta: round2(trip.ownerAmount),
    note: `Trip #${trip.tripNo} · ${trip.location}`,
    trip: trip._id,
  });
}

// every driver (or vendor) with what was earned, what was paid and what is still owed
export async function partyBalances(type) {
  const [parties, entries] = await Promise.all([
    partyModel(type).find({}).select("name phone companyName isActive").lean(),
    LedgerEntry.find({ party: type }).select("driver vendor delta kind date").lean(),
  ]);
  const rows = new Map(parties.map((p) => [String(p._id), { party: p, earned: 0, paid: 0, balance: 0, lastPayment: null, entries: 0 }]));
  for (const e of entries) {
    const row = rows.get(idOf({ ...e, party: type }));
    if (!row) continue;
    row.entries += 1;
    if (e.delta > 0) row.earned += e.delta;
    else row.paid -= e.delta;
    row.balance += e.delta;
    if (e.kind === "payment" && (!row.lastPayment || e.date > row.lastPayment)) row.lastPayment = e.date;
  }
  const list = [...rows.values()]
    .filter((r) => r.party.isActive !== false || r.entries > 0) // an inactive one still shows while it has history
    .map((r) => ({ ...r, earned: round2(r.earned), paid: round2(r.paid), balance: round2(r.balance) }));
  list.sort((a, b) => b.balance - a.balance || a.party.name.localeCompare(b.party.name));
  const sum = (k) => round2(list.reduce((s, r) => s + r[k], 0));
  return {
    items: list,
    totals: {
      earned: sum("earned"),
      paid: sum("paid"),
      owed: round2(list.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0)), // what the company still owes
      advance: round2(-list.filter((r) => r.balance < 0).reduce((s, r) => s + r.balance, 0)), // paid ahead
    },
  };
}

const particulars = (e) => {
  const note = e.note ? ` - ${e.note}` : "";
  if (e.kind === "duty") return e.note || "Trip";
  if (e.kind === "payment") return `Payment${e.method ? ` (${e.method})` : ""}${note}`;
  if (e.kind === "opening") return `Opening balance${note}`;
  return `Adjustment${note}`;
};

// the account of one driver or vendor, with a running balance. from / to are optional dates.
export async function ledgerStatement(type, party, { from, to } = {}) {
  const entries = await LedgerEntry.find({ party: type, [type]: party._id }).sort({ date: 1, createdAt: 1 }).lean();
  const start = from ? new Date(`${from}T00:00:00+06:00`) : null;
  const end = to ? new Date(new Date(`${to}T00:00:00+06:00`).getTime() + DAY) : null;

  const before = start ? entries.filter((e) => e.date < start) : [];
  const inRange = entries.filter((e) => (!start || e.date >= start) && (!end || e.date < end));
  const opening = round2(before.reduce((s, e) => s + e.delta, 0));

  let running = opening;
  const rows = inRange.map((e) => {
    running = round2(running + e.delta);
    return {
      _id: e._id,
      date: e.date,
      kind: e.kind,
      particulars: particulars(e),
      earned: e.delta > 0 ? e.delta : null,
      paid: e.delta < 0 ? -e.delta : null,
      balance: running,
      trip: e.trip || null,
      deletable: e.kind !== "duty", // trip lines follow the trip
    };
  });
  return {
    party: { _id: party._id, name: party.name, phone: party.phone, companyName: party.companyName },
    from: from || null,
    to: to || null,
    opening,
    earned: round2(rows.reduce((s, r) => s + (r.earned || 0), 0)),
    paid: round2(rows.reduce((s, r) => s + (r.paid || 0), 0)),
    closing: running,
    rows,
  };
}