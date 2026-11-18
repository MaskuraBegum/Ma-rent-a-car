import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { L, PageTitle } from "../lib/hr.jsx";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const POLICIES = [
  ["payLeaveDays", "Pay salary for leave days"],
  ["payHolidays", "Pay salary for holidays marked in attendance"],
  ["capAtBase", "Never pay more than full base salary (ignore extra days)"],
  ["deductAdvance", "Deduct advance installments from payroll"],
];

export default function HrSettings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/hr/settings").then(setS).catch((e) => toast(e.message, "err"));
  }, [toast]);
  if (!s) return <p className="text-sm text-slate-500">Loading...</p>;

  const toggleDay = (i) => setS({ ...s, weeklyHolidays: s.weeklyHolidays.includes(i) ? s.weeklyHolidays.filter((d) => d !== i) : [...s.weeklyHolidays, i].sort() });

  const save = async (e) => {
    e.preventDefault();
    const { weeklyHolidays, holidayAttendance, perDayBasis, halfDayValue, payLeaveDays, payHolidays, capAtBase, deductAdvance } = s;
    setSaving(true);
    try {
      setS(await api.patch("/hr/settings", { weeklyHolidays, holidayAttendance, perDayBasis, halfDayValue: Number(halfDayValue), payLeaveDays, payHolidays, capAtBase, deductAdvance }));
      toast("HR settings updated");
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageTitle en="HR settings" bn="এইচআর সেটিংস" />
      <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="mb-2 text-sm font-medium"><L en="Weekly holidays" bn="সাপ্তাহিক ছুটি" /></p>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.weeklyHolidays.includes(i)} onChange={() => toggleDay(i)} /> {d}
              </label>
            ))}
          </div>
        </div>

        <Field label="Attendance on weekly holidays *">
          <select className={inputCls} value={s.holidayAttendance} onChange={(e) => setS({ ...s, holidayAttendance: e.target.value })}>
            <option value="not_paid">Not paid (weekly holiday is already paid)</option>
            <option value="extra_paid">Paid extra (one more day's pay for each weekly holiday worked)</option>
          </select>
        </Field>
        <Field label="Per day salary basis *">
          <select className={inputCls} value={s.perDayBasis} onChange={(e) => setS({ ...s, perDayBasis: e.target.value })}>
            <option value="working_days">Working days of month (Base ÷ working days)</option>
            <option value="calendar_days">Calendar days of month (Base ÷ days in month)</option>
            <option value="fixed_30">Fixed 30 days (Base ÷ 30)</option>
          </select>
        </Field>
        <Field label="Half day counts as *">
          <select className={inputCls} value={s.halfDayValue} onChange={(e) => setS({ ...s, halfDayValue: e.target.value })}>
            <option value={0.5}>Half day (0.5)</option>
            <option value={1}>Full day (1)</option>
            <option value={0}>Absent (0)</option>
          </select>
        </Field>

        <div className="space-y-2">
          {POLICIES.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} /> {label}
            </label>
          ))}
        </div>

        <Button type="submit" disabled={saving}>{saving ? "Saving..." : <>Update <span className="text-xs opacity-80">(হালনাগাদ)</span></>}</Button>
      </form>
    </div>
  );
}