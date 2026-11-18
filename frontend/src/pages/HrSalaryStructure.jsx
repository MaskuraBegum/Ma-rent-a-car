import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, taka, dhakaToday } from "../utils.js";
import { PageTitle } from "../lib/hr.jsx";

const blank = () => ({ designation: "", baseSalary: "", perTripIncentive: "", foodAllowance: "", travelAllowance: "", otherAllowance: "", effectiveFrom: dhakaToday(), note: "" });
const NUMS = ["baseSalary", "perTripIncentive", "foodAllowance", "travelAllowance", "otherAllowance"];

export default function HrSalaryStructure() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [desig, setDesig] = useState([]);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await api.get("/hr/structures")).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
    api.get("/hr/designations").then((r) => setDesig(r.items)).catch(() => {});
  }, [load]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    const body = { designation: form.designation, effectiveFrom: form.effectiveFrom };
    for (const k of NUMS) if (form[k] !== "") body[k] = Number(form[k]);
    if (form.note.trim()) body.note = form.note.trim();
    setSaving(true);
    try {
      await api.post("/hr/structures", body);
      toast("Salary structure saved");
      setForm(blank());
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (r) => {
    try {
      await api.patch(`/hr/structures/${r._id}`, { isActive: !r.isActive });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (r) => {
    if (!window.confirm(`Delete the ${r.designation} structure?`)) return;
    try {
      await api.del(`/hr/structures/${r._id}`);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <PageTitle en="Salary structure" bn="বেতন কাঠামো" />
      <form onSubmit={add} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Designation *">
          <select required className={inputCls} value={form.designation} onChange={set("designation")}>
            <option value="">Select designation</option>
            {desig.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Base salary (৳) *"><input type="number" min="0" required className={inputCls} value={form.baseSalary} onChange={set("baseSalary")} /></Field>
        <Field label="Per-trip incentive (৳)"><input type="number" min="0" className={inputCls} value={form.perTripIncentive} onChange={set("perTripIncentive")} /></Field>
        <Field label="Food allowance (৳)"><input type="number" min="0" className={inputCls} value={form.foodAllowance} onChange={set("foodAllowance")} /></Field>
        <Field label="Travel allowance (৳)"><input type="number" min="0" className={inputCls} value={form.travelAllowance} onChange={set("travelAllowance")} /></Field>
        <Field label="Other allowance (৳)"><input type="number" min="0" className={inputCls} value={form.otherAllowance} onChange={set("otherAllowance")} /></Field>
        <Field label="Effective from *"><input type="date" required className={inputCls} value={form.effectiveFrom} onChange={set("effectiveFrom")} /></Field>
        <Field label="Note"><input className={inputCls} value={form.note} onChange={set("note")} /></Field>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save structure"}</Button></div>
      </form>

      {rows.length === 0 ? (
        <Empty>No salary structure yet. Payroll needs one for each designation.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Designation</th><th className="px-3 py-2 text-right">Base</th><th className="px-3 py-2 text-right">Per trip</th>
                <th className="px-3 py-2 text-right">Food</th><th className="px-3 py-2 text-right">Travel</th><th className="px-3 py-2 text-right">Other</th>
                <th className="px-3 py-2">From</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id} className={r.isActive ? "" : "opacity-60"}>
                  <td className="px-3 py-2 font-medium">{r.designation}{r.note && <p className="text-xs font-normal text-slate-500">{r.note}</p>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.baseSalary)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.perTripIncentive)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.foodAllowance)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.travelAllowance)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka(r.otherAllowance)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.effectiveFrom)}</td>
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