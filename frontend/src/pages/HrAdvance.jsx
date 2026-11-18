import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, taka, dhakaToday } from "../utils.js";
import { cap, EmployeeSelect, empName, PageTitle, splitKey, STATUS_TONE, useEmployees } from "../lib/hr.jsx";

const blank = () => ({ emp: "", date: dhakaToday(), amount: "", monthlyDeduction: "", reason: "" });

export default function HrAdvance() {
  const toast = useToast();
  const employees = useEmployees();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank());
  const [filter, setFilter] = useState({ employee: "", status: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filter.employee) p.set("employee", filter.employee);
      if (filter.status) p.set("status", filter.status);
      setRows((await api.get(`/hr/advances?${p}`)).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [filter, toast]);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...splitKey(form.emp), date: form.date, amount: Number(form.amount) };
    if (form.monthlyDeduction !== "") body.monthlyDeduction = Number(form.monthlyDeduction);
    if (form.reason.trim()) body.reason = form.reason.trim();
    setSaving(true);
    try {
      await api.post("/hr/advances", body);
      toast("Advance request saved");
      setForm(blank());
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };
  const setStatus = async (r, status) => {
    try {
      await api.patch(`/hr/advances/${r._id}`, { status });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (r) => {
    if (!window.confirm("Delete this advance?")) return;
    try {
      await api.del(`/hr/advances/${r._id}`);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <PageTitle en="Advance" bn="অগ্রিম" />
      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Employee *"><EmployeeSelect required employees={employees} value={form.emp} onChange={(v) => setForm({ ...form, emp: v })} /></Field>
        <Field label="Date *"><input type="date" required className={inputCls} value={form.date} onChange={set("date")} /></Field>
        <Field label="Advance amount (৳) *"><input type="number" min="1" required className={inputCls} value={form.amount} onChange={set("amount")} /></Field>
        <Field label="Monthly deduction (৳)" hint="Taken from salary each month. Empty = all at once"><input type="number" min="0" className={inputCls} value={form.monthlyDeduction} onChange={set("monthlyDeduction")} /></Field>
        <Field label="Reason" className="sm:col-span-2"><input className={inputCls} value={form.reason} onChange={set("reason")} /></Field>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Submit"}</Button></div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Advance list</h2>
        <div className="w-56"><EmployeeSelect employees={employees} allLabel="All employees" value={filter.employee} onChange={(v) => setFilter({ ...filter, employee: v })} /></div>
        <select className={`${inputCls} w-auto`} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cleared">Cleared</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty>No advances.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Employee</th><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Monthly</th><th className="px-3 py-2 text-right">Repaid</th><th className="px-3 py-2 text-right">Remaining</th>
                <th className="px-3 py-2">Status</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-3 py-2"><p className="font-medium">{empName(r)}</p>{r.reason && <p className="text-xs text-slate-500">{r.reason}</p>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.monthlyDeduction ? taka(r.monthlyDeduction) : "All at once"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.repaid)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{taka(r.amount - r.repaid)}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.status]}>{cap(r.status)}</Badge></td>
                  <td className="px-3 py-2"><div className="flex justify-end gap-2">
                    {r.status === "pending" && <Button onClick={() => setStatus(r, "approved")}>Approve</Button>}
                    {r.status === "pending" && <Button variant="secondary" onClick={() => setStatus(r, "rejected")}>Reject</Button>}
                    <Button variant="danger" onClick={() => remove(r)}>Delete</Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}