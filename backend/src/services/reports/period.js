const DHAKA = "Asia/Dhaka";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const dhakaDay = (iso) => new Date(`${iso}T00:00:00+06:00`);

export const fmtDay = (d) =>
  new Date(d).toLocaleDateString("en-GB", { timeZone: DHAKA, day: "2-digit", month: "short", year: "numeric" });

const dhakaNow = () => {
  const [year, month] = new Date().toLocaleDateString("en-CA", { timeZone: DHAKA }).split("-").map(Number);
  return { year, month };
};

// Turns the report filters into a date range: start <= date < end (Dhaka time).
// Throws an Error with a plain message when the input is not usable.
export function resolvePeriod({ frequency = "monthly", month, year, from, to }) {
  const now = dhakaNow();

  if (frequency === "range") {
    if (!from || !to) throw new Error("Choose both a from date and a to date");
    const start = dhakaDay(from);
    const last = dhakaDay(to);
    if (isNaN(start) || isNaN(last)) throw new Error("Invalid date");
    if (last < start) throw new Error("The to date is before the from date");
    return { frequency, start, end: new Date(last.getTime() + 86400000), label: `${fmtDay(start)} to ${fmtDay(last)}` };
  }

  const y = year ?? now.year;
  if (frequency === "yearly") {
    return { frequency, start: dhakaDay(`${y}-01-01`), end: dhakaDay(`${y + 1}-01-01`), label: String(y) };
  }

  const m = month ?? now.month;
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  return {
    frequency,
    start: dhakaDay(`${y}-${pad(m)}-01`),
    end: dhakaDay(`${ny}-${pad(nm)}-01`),
    label: `${MONTH_NAMES[m - 1]} ${y}`,
  };
}
