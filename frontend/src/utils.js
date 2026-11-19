
const DHAKA = "Asia/Dhaka";

export const fmtPhone = (p) => (p ? `+${p}` : "");
export const taka = (n) => `৳${Number(n || 0).toLocaleString("en-US")}`;

// "2026-11-15" in Dhaka time (what <input type="date"> expects)
export const dhakaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: DHAKA });
export const toDateInput = (d) => (d ? new Date(d).toLocaleDateString("en-CA", { timeZone: DHAKA }) : "");
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { timeZone: DHAKA, day: "2-digit", month: "short", year: "numeric" });

export const minutesSince = (d) => Math.max(0, Math.round((Date.now() - new Date(d)) / 60000));
export const waitingLabel = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

// One dropdown for clients and corporate units. Value is "clientId" or "clientId|unitId".
export const clientOptions = (clients) =>
  clients.flatMap((c) =>
    c.type === "corporate"
      ? (c.units || []).map((u) => ({ value: `${c._id}|${u._id}`, label: `${c.name} - ${u.name}` }))
      : [{ value: c._id, label: c.name }]
  );

export const splitClient = (v) => {
  if (!v) return {};
  const [client, unitId] = v.split("|");
  return unitId ? { client, unitId } : { client };
};

export const clientValue = (trip) =>
  trip.client ? (trip.unitId ? `${trip.client._id}|${trip.unitId}` : trip.client._id) : "";

// ---- trip duration (same rule as the server) ----
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Hours from pickup date + start time to unloading date + finish time.
// Without an unloading date it is the same day (or past midnight). Returns null when it cannot be worked out.
export function tripHours({ date, startTime, dropDate, finishTime }) {
  if (!date || !startTime || !finishTime) return null;
  const days = dropDate ? Math.round((new Date(dropDate) - new Date(date)) / 86400000) : 0;
  let mins = days * 1440 + toMin(finishTime) - toMin(startTime);
  if (!dropDate && mins < 0) mins += 1440;
  if (mins < 0) return null;
  return Math.round((mins / 60) * 100) / 100;
}

// 5 -> "5 h", 5.5 -> "5 h 30 min", 50.5 -> "50.5 h (2 days 2 h 30 min)"
export function fmtDuration(hours) {
  if (hours === null || hours === undefined) return "";
  const total = Math.round(hours * 60);
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const parts = [d ? `${d} day${d > 1 ? "s" : ""}` : "", h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean);
  const text = parts.join(" ") || "0 min";
  return d ? `${Number(hours.toFixed(2))} h (${text})` : text;
}

export const dayDiff = (from, to) => Math.round((new Date(to) - new Date(from)) / 86400000);

// ---- invoices ----
export const taka2 = (n) =>
  `৳${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "2026-11-14" plus some days, in Dhaka dates
export const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const isOverdue = (inv) =>
  inv.status === "overdue" ||
  (["sent", "unpaid", "partial"].includes(inv.status) && inv.balance > 0 && toDateInput(inv.dueDate) < dhakaToday());
