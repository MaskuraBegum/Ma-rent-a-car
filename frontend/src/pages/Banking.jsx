import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Empty } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { taka2 } from "../utils.js";

const TYPES = { cash: "Cash drawer", bank: "Bank", mobile: "Mobile banking", card: "Credit card" };

// Cash in Hand = cash accounts, Bank Balance = bank + mobile banking, Card Balance = cards
const CARDS = [
  { key: "cash", label: "Cash in Hand", bn: "হাতে নগদ", types: ["cash"] },
  { key: "bank", label: "Bank Balance", bn: "ব্যাংক ব্যালেন্স", types: ["bank", "mobile"] },
  { key: "card", label: "Card Balance", bn: "কার্ড ব্যালেন্স", types: ["card"] },
];

function RowMenu({ account, onDeactivate }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button type="button" onClick={() => setOpen(!open)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50" aria-expanded={open}>
        Actions ▾
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => nav(`/transactions?account=${account._id}`)}>
            Transaction <span className="text-xs text-slate-500">(লেনদেন)</span>
          </button>
          <button
            type="button"
            className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${account.isActive ? "text-red-600" : "text-emerald-700"}`}
            onClick={() => {
              setOpen(false);
              onDeactivate(account);
            }}
          >
            {account.isActive ? <>Deactivate <span className="text-xs">(নিষ্ক্রিয় করুন)</span></> : <>Activate <span className="text-xs">(সক্রিয় করুন)</span></>}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Banking() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await api.get("/transactions/accounts")).items);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (a) => {
    if (a.isActive && !window.confirm(`Deactivate ${a.name}? Its entries stay.`)) return;
    try {
      await api.patch(`/transactions/accounts/${a._id}`, { isActive: !a.isActive });
      toast(a.isActive ? "Deactivated" : "Activated");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const live = rows.filter((a) => a.isActive);
  const sum = (types, field) => live.filter((a) => types.includes(a.type)).reduce((s, a) => s + (a[field] || 0), 0);
  const shown = showInactive ? rows : live;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          Banking <span className="text-sm font-normal text-slate-500">(ব্যাংকিং)</span>
        </h1>
        <Link to="/transactions/accounts" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">+ Add account</Link>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {CARDS.map((c) => {
          const opening = sum(c.types, "openingBalance");
          const current = sum(c.types, "balance");
          return (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">
                {c.label} <span className="text-xs font-normal text-slate-500">({c.bn})</span>
              </p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${current < 0 ? "text-red-600" : "text-slate-900"}`}>{taka2(current)}</p>
              <p className="mt-1 text-xs text-slate-500">Opening {taka2(opening)} · Change {taka2(current - opening)}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex items-center gap-3">
        <h2 className="mr-auto font-semibold">
          Bank list <span className="text-sm font-normal text-slate-500">(ব্যাংক তালিকা)</span>
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : shown.length === 0 ? (
        <Empty>No accounts yet. Use “Add account” to create one (cash drawer, bank, card).</Empty>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Opening balance</th>
                  <th className="px-3 py-2 text-right">Current balance</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((a, i) => (
                  <tr key={a._id} className={a.isActive ? "" : "opacity-60"}>
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{a.name}</p>
                      {a.accountNo && <p className="text-xs text-slate-500">{a.accountNo}</p>}
                    </td>
                    <td className="px-3 py-2">{TYPES[a.type]}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(a.openingBalance)}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${a.balance < 0 ? "text-red-600" : ""}`}>{taka2(a.balance)}</td>
                    <td className="px-3 py-2">{a.isActive ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td className="px-3 py-2 text-right"><RowMenu account={a} onDeactivate={toggle} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={3}>Total (active)</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(live.reduce((s, a) => s + (a.openingBalance || 0), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(live.reduce((s, a) => s + a.balance, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}