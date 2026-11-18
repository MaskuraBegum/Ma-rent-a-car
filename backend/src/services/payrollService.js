// Pure payroll maths: no database in here, so it is easy to test.
const pad = (n) => String(n).padStart(2, "0");
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const dkey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

export function monthRange(month) {
  const [y, mo] = month.split("-").map(Number);
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  return {
    y, mo,
    days: new Date(Date.UTC(y, mo, 0)).getUTCDate(),
    start: new Date(`${month}-01T00:00:00+06:00`),
    end: new Date(`${ny}-${pad(nm)}-01T00:00:00+06:00`),
  };
}

// For every day of the month: P A HD H L, or W (weekly holiday), or "" (not marked)
// records: Map "YYYY-MM-DD" -> { status }; leaves: [{ from, to, paid }] (approved only)
export function resolveMonth(month, settings, records, leaves) {
  const { y, mo, days } = monthRange(month);
  const weekly = new Set(settings.weeklyHolidays);
  const codes = [];
  const c = { P: 0, A: 0, HD: 0, H: 0, Lpaid: 0, Lunpaid: 0, W: 0, unmarked: 0, extraWeekly: 0 };
  for (let d = 1; d <= days; d++) {
    const key = `${month}-${pad(d)}`;
    const rec = records.get(key);
    let code = "";
    if (weekly.has(new Date(Date.UTC(y, mo - 1, d)).getUTCDay())) {
      code = "W";
      c.W++;
      if (rec?.status === "P") c.extraWeekly++;
    } else if (rec) {
      code = rec.status;
      if (code === "L") c.Lpaid++;
      else c[code]++;
    } else {
      const lv = leaves.find((l) => key >= l.from && key <= l.to);
      if (lv) {
        code = "L";
        lv.paid ? c.Lpaid++ : c.Lunpaid++;
      } else c.unmarked++;
    }
    codes.push(code);
  }
  return { days, codes, counts: c };
}

export function computeSalary({ base, food = 0, travel = 0, other = 0, perTrip = 0, trips = 0, days, counts, settings, advanceDue = 0, finesDue = 0 }) {
  const workingDays = days - counts.W;
  const divisor = settings.perDayBasis === "calendar_days" ? days : settings.perDayBasis === "fixed_30" ? 30 : workingDays;
  const perDay = divisor > 0 ? base / divisor : 0;
  const credits =
    counts.P + counts.HD * settings.halfDayValue + (settings.payLeaveDays ? counts.Lpaid : 0) + (settings.payHolidays ? counts.H : 0);
  // with calendar or 30-day pay the weekly holidays are paid days; with working-day pay they are already inside the base
  const paidDays = credits + (settings.perDayBasis === "working_days" ? 0 : counts.W);
  const extraDays = settings.holidayAttendance === "extra_paid" ? counts.extraWeekly : 0;
  let earnedBase = perDay * (paidDays + extraDays);
  if (settings.capAtBase) earnedBase = Math.min(earnedBase, base);
  const incentive = trips * perTrip;
  const gross = earnedBase + incentive + food + travel + other;
  const fines = Math.min(finesDue, gross);
  const advance = settings.deductAdvance ? Math.min(advanceDue, Math.max(0, gross - fines)) : 0;
  return {
    workingDays,
    perDay: round2(perDay),
    paidDays: round2(paidDays + extraDays),
    earnedBase: round2(earnedBase),
    incentive: round2(incentive),
    gross: round2(gross),
    advance: round2(advance),
    fines: round2(fines),
    net: round2(gross - fines - advance),
  };
}