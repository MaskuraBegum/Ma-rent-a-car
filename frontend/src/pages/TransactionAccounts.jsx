import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { taka2 } from "../utils.js";

const TYPES = { cash: "Cash drawer", bank: "Bank", mobile: "Mobile banking", card: "Card" };
const blank = { name: "", type: "cash", accountNo: "", openingBalance: "" };

export default function TransactionAccounts() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await api.get("/transactions/accounts")).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    const body = { name: form.name.trim(), type: form.type };
    if (form.accountNo.trim()) body.accountNo = form.accountNo.trim();
    if (form.openingBalance !== "") body.openingBalance = Number(form.openingBalance);
    setSaving(true);
    try {
      await api.post("/transactions/accounts", body);
      toast("Account added");
      setForm(blank);
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a) => {
    try {
      await api.patch(`/transactions/accounts/${a._id}`, { isActive: !a.isActive });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (a) => {
    if (!window.confirm(`Delete ${a.name}?`)) return;
    try {
      await api.del(`/transactions/accounts/${a._id}`);
      toast("Deleted");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          Accounts <span className="text-sm font-normal text-slate-500">(হিসাব)</span>
        </h1>
        <Link to="/transactions" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Back to transactions
        </Link>
      </div>

      <form onSubmit={add} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Name *"><input required className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. BRAC Bank" /></Field>
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={set("type")}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Account no."><input className={inputCls} value={form.accountNo} onChange={set("accountNo")} /></Field>
        <Field label="Opening balance (৳)"><input type="number" step="0.01" className={inputCls} value={form.openingBalance} onChange={set("openingBalance")} /></Field>
        <div className="flex items-end"><Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "+ Add account"}</Button></div>
      </form>

      {rows.length === 0 ? (
        <Empty>No accounts yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Opening</th>
                <th className="px-3 py-2 text-right">In</th>
                <th className="px-3 py-2 text-right">Out</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => (
                <tr key={a._id} className={a.isActive ? "" : "opacity-60"}>
                  <td className="px-3 py-2"><p className="font-medium">{a.name}</p>{a.accountNo && <p className="text-xs text-slate-500">{a.accountNo}</p>}</td>
                  <td className="px-3 py-2">{TYPES[a.type]}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(a.openingBalance)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{taka2(a.cashIn)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600">{taka2(a.cashOut)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{taka2(a.balance)}</td>
                  <td className="px-3 py-2">{a.isActive ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => toggle(a)}>{a.isActive ? "Deactivate" : "Activate"}</Button>
                      <Button variant="danger" onClick={() => remove(a)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}