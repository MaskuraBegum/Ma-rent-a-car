import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { L, PageTitle } from "../lib/hr.jsx";

const blank = { name: "", maxDaysPerYear: "", isPaid: true };

export default function HrLeaveTypes() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await api.get("/hr/leave-types")).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/hr/leave-types", { name: form.name.trim(), maxDaysPerYear: Number(form.maxDaysPerYear || 0), isPaid: form.isPaid });
      toast("Leave type added");
      setForm(blank);
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (r) => {
    try {
      await api.patch(`/hr/leave-types/${r._id}`, { isActive: !r.isActive });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (r) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    try {
      await api.del(`/hr/leave-types/${r._id}`);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <PageTitle en="Leave types" bn="ছুটির ধরন" />
      <form onSubmit={add} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name *"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Casual leave" /></Field>
        <Field label="Max days per year" hint="0 = no limit"><input type="number" min="0" className={inputCls} value={form.maxDaysPerYear} onChange={(e) => setForm({ ...form, maxDaysPerYear: e.target.value })} /></Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} /> Paid leave</label>
        <div className="flex items-end"><Button type="submit" disabled={saving} className="w-full">+ Add leave type</Button></div>
      </form>

      {rows.length === 0 ? (
        <Empty>No leave types yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Max days / year</th><th className="px-3 py-2">Paid</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id} className={r.isActive ? "" : "opacity-60"}>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.maxDaysPerYear || "No limit"}</td>
                  <td className="px-3 py-2">{r.isPaid ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">Unpaid</Badge>}</td>
                  <td className="px-3 py-2">{r.isActive ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td className="px-3 py-2"><div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => toggle(r)}>{r.isActive ? "Deactivate" : "Activate"}</Button>
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