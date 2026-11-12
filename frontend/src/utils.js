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
      : [{ value: c._id, label: `${c.name} (${c.type})` }]
  );

export const splitClient = (v) => {
  if (!v) return {};
  const [client, unitId] = v.split("|");
  return unitId ? { client, unitId } : { client };
};

export const clientValue = (trip) =>
  trip.client ? (trip.unitId ? `${trip.client._id}|${trip.unitId}` : trip.client._id) : "";
