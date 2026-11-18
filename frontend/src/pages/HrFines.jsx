import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, taka, dhakaToday } from "../utils.js";
import { cap, EmployeeSelect, empName, PageTitle, splitKey, STATUS_TONE, useEmployees } from "../lib/hr.jsx";

const blank = () => ({ emp: "", date: dhakaToday(), amount: "", reason: "", note: "" });

export default function HrFines() {
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
      setRows((await api.get(`/hr/fines?${p}`)).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [filter, toast]);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...splitKey(form.emp), date: form.date, amount: Number(form.amount), reason: form.reason.trim() };
    if (form.note.trim()) body.note = form.note.trim();
    setSaving(true);
    try {
      await api.post("/hr/fines", body);
      toast("Fine recorded");
      setForm(blank());
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };
  const waive = async (r) => {
    try {
      await api.patch(`/hr/fines/${r._id}`, { status: r.status === "waived" ? "pending" : "waived" });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (r) => {
    if (!window.confirm("Delete this fine?")) return;
    try {
      await api.del(`/hr/fines/${r._id}`);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <PageTitle en="Fines" bn="জরিমানা" />
      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Employee *"><EmployeeSelect required employees={employees} value={form.emp} onChange={(v) => setForm({ ...form, emp: v })} /></Field>
        <Field label="Date *"><input type="date" required className={inputCls} value={form.date} onChange={set("date")} /></Field>
        <Field label="Fine amount (৳) *"><input type="number" min="1" required className={inputCls} value={form.amount} onChange={set("amount")} /></Field>
        <Field label="Reason *" className="sm:col-span-2"><input required className={inputCls} value={form.reason} onChange={set("reason")} /></Field>
        <Field label="Note"><input className={inputCls} value={form.note} onChange={set("note")} /></Field>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Record fine"}</Button></div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Fines list</h2>
        <div className="w-56"><EmployeeSelect employees={employees} allLabel="All employees" value={filter.employee} onChange={(v) => setFilter({ ...filter, employee: v })} /></div>
        <select className={`${inputCls} w-auto`} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All status</option><option value="pending">Pending</option><option value="deducted">Deducted</option><option value="waived">Waived</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty>No fines.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-3 py-2 font-medium">{empName(r)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2">{r.reason}{r.note && <p className="text-xs text-slate-500">{r.note}</p>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.amount)}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.status]}>{cap(r.status)}</Badge></td>
                  <td className="px-3 py-2"><div className="flex justify-end gap-2">
                    {r.status !== "deducted" && <Button variant="secondary" onClick={() => waive(r)}>{r.status === "waived" ? "Restore" : "Waive"}</Button>}
                    {r.status !== "deducted" && <Button variant="danger" onClick={() => remove(r)}>Delete</Button>}
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