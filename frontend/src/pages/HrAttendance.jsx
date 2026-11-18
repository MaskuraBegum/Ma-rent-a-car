import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { dhakaToday } from "../utils.js";
import { monthNow, PageTitle } from "../lib/hr.jsx";

const OPTIONS = [["", "Not marked"], ["P", "Present"], ["A", "Absent"], ["L", "Leave"], ["HD", "Half day"], ["H", "Holiday"]];
const CODE_CLS = {
  P: "bg-emerald-100 text-emerald-800", A: "bg-red-100 text-red-700", L: "bg-sky-100 text-sky-800",
  HD: "bg-amber-100 text-amber-800", H: "bg-violet-100 text-violet-800", W: "bg-slate-200 text-slate-600",
};
const AUTO = { W: "Weekly holiday", L: "On approved leave" };

export default function HrAttendance() {
  const toast = useToast();
  const [date, setDate] = useState(dhakaToday());
  const [day, setDay] = useState({ items: [], weekly: false });
  const [edit, setEdit] = useState({}); // key -> { status, note }
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(monthNow());
  const [matrix, setMatrix] = useState(null);

  const loadDay = useCallback(async () => {
    try {
      const r = await api.get(`/hr/attendance?date=${date}`);
      setDay(r);
      setEdit(Object.fromEntries(r.items.map((e) => [e.key, { status: e.status, note: e.note }])));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [date, toast]);
  const loadMonth = useCallback(async () => {
    try {
      setMatrix(await api.get(`/hr/attendance/month?month=${month}`));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [month, toast]);
  useEffect(() => {
    loadDay();
  }, [loadDay]);
  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const setRow = (key, patch) => setEdit((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  const markAll = (status) => setEdit((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, status }])));

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/hr/attendance/bulk", {
        date,
        entries: day.items.map((e) => ({ employeeModel: e.employeeModel, employee: e.employee, status: edit[e.key]?.status || "", note: edit[e.key]?.note || "" })),
      });
      toast("Attendance saved");
      loadDay();
      loadMonth();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageTitle en="Attendance" bn="উপস্থিতি" />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          {day.weekly && <Badge tone="amber">Weekly holiday</Badge>}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => markAll("P")}>Mark all present</Button>
            <Button variant="secondary" onClick={() => markAll("")}>Clear</Button>
            <Button onClick={save} disabled={saving || day.items.length === 0}>{saving ? "Saving..." : "Save attendance"}</Button>
          </div>
        </div>
        {day.items.length === 0 ? (
          <Empty>No employees yet. Add staff or drivers first.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr><th className="px-2 py-2">Employee</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {day.items.map((e) => (
                  <tr key={e.key}>
                    <td className="px-2 py-1.5"><span className="font-medium">{e.name}</span> <span className="text-xs text-slate-500">{e.designation}</span></td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <select className={`${inputCls} w-40`} value={edit[e.key]?.status || ""} onChange={(ev) => setRow(e.key, { status: ev.target.value })}>
                          {OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                        {e.auto && !edit[e.key]?.status && <span className="text-xs text-slate-500">{AUTO[e.auto]}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5"><input className={inputCls} value={edit[e.key]?.note || ""} onChange={(ev) => setRow(e.key, { note: ev.target.value })} placeholder="Note" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto font-semibold">Monthly summary</h2>
        <input type="month" className={`${inputCls} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <p className="mb-2 text-xs text-slate-500">P present · A absent · L leave · HD half day · H holiday · W weekly holiday · blank = not marked</p>
      {matrix && matrix.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-2 py-2 text-left">Employee</th>
                {Array.from({ length: matrix.days }, (_, i) => <th key={i} className="px-1 py-2 text-center font-medium">{i + 1}</th>)}
                {["P", "A", "L", "HD", "H"].map((t) => <th key={t} className="px-2 py-2 text-center">{t}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.items.map((e) => (
                <tr key={e.key}>
                  <td className="sticky left-0 whitespace-nowrap bg-white px-2 py-1.5 font-medium">{e.name}</td>
                  {e.codes.map((c, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      {c && <span className={`inline-block min-w-[1.5rem] rounded px-1 py-0.5 ${CODE_CLS[c]}`}>{c}</span>}
                    </td>
                  ))}
                  {["P", "A", "L", "HD", "H"].map((t) => <td key={t} className="px-2 py-1.5 text-center tabular-nums font-medium">{e.totals[t]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}