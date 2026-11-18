import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, dhakaToday } from "../utils.js";
import { cap, EmployeeSelect, empName, PageTitle, splitKey, STATUS_TONE, useEmployees } from "../lib/hr.jsx";

const blank = () => ({ emp: "", leaveType: "", from: dhakaToday(), to: dhakaToday(), reason: "" });

export default function HrLeave() {
  const toast = useToast();
  const employees = useEmployees();
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank());
  const [filter, setFilter] = useState({ employee: "", status: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filter.employee) p.set("employee", filter.employee);
      if (filter.status) p.set("status", filter.status);
      setRows((await api.get(`/hr/leaves?${p}`)).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [filter, toast]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api.get("/hr/leave-types?active=true").then((r) => setTypes(r.items)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...splitKey(form.emp), leaveType: form.leaveType, from: form.from, to: form.to };
    if (form.reason.trim()) body.reason = form.reason.trim();
    setSaving(true);
    try {
      await api.post("/hr/leaves", body);
      toast("Leave request submitted");
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
      await api.patch(`/hr/leaves/${r._id}`, { status });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (r) => {
    if (!window.confirm("Delete this leave request?")) return;
    try {
      await api.del(`/hr/leaves/${r._id}`);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <PageTitle en="Leave" bn="ছুটি" />
      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Employee *"><EmployeeSelect required employees={employees} value={form.emp} onChange={(v) => setForm({ ...form, emp: v })} /></Field>
        <Field label="Leave type *">
          <select required className={inputCls} value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
            <option value="">Select leave type</option>
            {types.map((t) => <option key={t._id} value={t._id}>{t.name}{t.isPaid ? "" : " (unpaid)"}</option>)}
          </select>
        </Field>
        <span />
        <Field label="From *"><input type="date" required className={inputCls} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
        <Field label="To *"><input type="date" required className={inputCls} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
        <Field label="Reason"><input className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit"}</Button></div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Leave requests</h2>
        <div className="w-56"><EmployeeSelect employees={employees} allLabel="All employees" value={filter.employee} onChange={(v) => setFilter({ ...filter, employee: v })} /></div>
        <select className={`${inputCls} w-auto`} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty>No leave requests.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Dates</th><th className="px-3 py-2">Days</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-3 py-2"><p className="font-medium">{empName(r)}</p>{r.reason && <p className="text-xs text-slate-500">{r.reason}</p>}</td>
                  <td className="px-3 py-2">{r.leaveType?.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.from)}{r.days > 1 && ` - ${fmtDate(r.to)}`}</td>
                  <td className="px-3 py-2">{r.days}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.status]}>{cap(r.status)}</Badge></td>
                  <td className="px-3 py-2"><div className="flex justify-end gap-2">
                    {r.status !== "approved" && <Button onClick={() => setStatus(r, "approved")}>Approve</Button>}
                    {r.status !== "rejected" && <Button variant="secondary" onClick={() => setStatus(r, "rejected")}>Reject</Button>}
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