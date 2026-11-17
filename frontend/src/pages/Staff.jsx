import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, fmtPhone, taka, toDateInput } from "../utils.js";

const ROLES = ["Manager", "Accountant", "Office staff", "Helper", "Mechanic", "Other"];
const blank = { name: "", designation: "Office staff", phone: "", email: "", nidNo: "", joiningDate: "", salary: "", address: "" };

export default function Staff() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState("true");
  const [editing, setEditing] = useState(null); // null closed, {} new, record edit
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: "200" });
      if (q) p.set("search", q);
      if (active !== "all") p.set("active", active);
      setRows((await api.get(`/staff?${p}`)).items);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [q, active, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (r) => {
    setEditing(r || {});
    setForm(
      r
        ? {
            name: r.name || "", designation: r.designation || "Office staff", phone: fmtPhone(r.phone), email: r.email || "",
            nidNo: r.nidNo || "", joiningDate: toDateInput(r.joiningDate), salary: r.salary ?? "", address: r.address || "",
          }
        : blank
    );
  };
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const body = { name: form.name.trim(), designation: form.designation, phone: form.phone.trim() };
    for (const k of ["email", "nidNo", "joiningDate", "address"]) if (form[k].trim()) body[k] = form[k].trim();
    if (form.salary !== "") body.salary = Number(form.salary);
    setSaving(true);
    try {
      if (editing._id) await api.patch(`/staff/${editing._id}`, body);
      else await api.post("/staff", body);
      toast("Staff saved");
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (r) => {
    if (!window.confirm(`Deactivate ${r.name}? The record stays. You can activate again later.`)) return;
    try {
      await api.del(`/staff/${r._id}`);
      toast("Deactivated");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const activate = async (r) => {
    try {
      await api.patch(`/staff/${r._id}`, { isActive: true });
      toast("Activated");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Staff <span className="text-sm font-normal text-slate-500">(স্টাফ)</span></h1>
        <input className={`${inputCls} sm:w-56`} placeholder="Search name, phone or role" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${inputCls} w-auto`} value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="all">All</option>
        </select>
        <Button onClick={() => open(null)}>+ New entry</Button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : rows.length === 0 ? (
        <Empty>No staff found. Use “New entry” to add the first one.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2 text-right">Salary</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r._id} className={r.isActive ? "" : "opacity-60"}>
                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.name}</p>
                    {r.email && <p className="text-xs text-slate-500">{r.email}</p>}
                  </td>
                  <td className="px-3 py-2">{r.designation}</td>
                  <td className="px-3 py-2 tabular-nums">{fmtPhone(r.phone)}</td>
                  <td className="px-3 py-2">{r.joiningDate ? fmtDate(r.joiningDate) : "-"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.salary ? taka(r.salary) : "-"}</td>
                  <td className="px-3 py-2">{r.isActive ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => open(r)}>Edit</Button>
                      {r.isActive ? (
                        <Button variant="danger" onClick={() => deactivate(r)}>Deactivate</Button>
                      ) : (
                        <Button onClick={() => activate(r)}>Activate</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing._id ? "Edit staff" : "New staff entry"} onClose={() => setEditing(null)} wide>
          <form onSubmit={save}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name *"><input className={inputCls} required value={form.name} onChange={set("name")} /></Field>
              <Field label="Role">
                <select className={inputCls} value={form.designation} onChange={set("designation")}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Phone number *"><input type="tel" className={inputCls} required value={form.phone} onChange={set("phone")} placeholder="+8801XXXXXXXXX" /></Field>
              <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={set("email")} /></Field>
              <Field label="NID number" hint="10, 13 or 17 digits"><input className={inputCls} value={form.nidNo} onChange={set("nidNo")} /></Field>
              <Field label="Joining date"><input type="date" className={inputCls} value={form.joiningDate} onChange={set("joiningDate")} /></Field>
              <Field label="Monthly salary (৳)"><input type="number" min="0" className={inputCls} value={form.salary} onChange={set("salary")} /></Field>
              <Field label="Address"><input className={inputCls} value={form.address} onChange={set("address")} /></Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}