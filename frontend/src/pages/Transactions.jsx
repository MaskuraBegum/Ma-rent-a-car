import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { dhakaToday, fmtDate, taka2 } from "../utils.js";

const TABS = [
  { key: "in", label: "Cash In / Deposit", bn: "নগদ জমা", tone: "green" },
  { key: "out", label: "Cash Out / Expense", bn: "নগদ খরচ", tone: "red" },
  { key: "transfer", label: "Transfer", bn: "স্থানান্তর", tone: "blue" },
];
const METHOD = { cash: "Cash", bank_transfer: "Bank transfer", cheque: "Cheque", bkash: "bKash", nagad: "Nagad", card: "Card", other: "Other" };
const L = ({ en, bn }) => (
  <>
    {en} <span className="text-xs font-normal text-slate-500">({bn})</span>
  </>
);

const blank = () => ({
  date: dhakaToday(), account: "", toAccount: "", source: "", category: "", payee: "",
  amount: "", voucherNo: "", method: "", transactionId: "", description: "",
});

export default function Transactions() {
  const toast = useToast();
  const [tab, setTab] = useState("in");
  const [accounts, setAccounts] = useState([]);
  const [opts, setOpts] = useState({ sources: [], categories: [], methods: [] });
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ in: 0, out: 0, transfer: 0 });
  const [filter, setFilter] = useState({ type: "", account: "", from: "", to: "", search: "" });
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(filter.search), 300);
    return () => clearTimeout(t);
  }, [filter.search]);

  const loadAccounts = useCallback(async () => {
    try {
      setAccounts((await api.get("/transactions/accounts")).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [toast]);

  const loadRows = useCallback(async () => {
    try {
      const p = new URLSearchParams({ limit: "100" });
      if (filter.type) p.set("type", filter.type);
      if (filter.account) p.set("account", filter.account);
      if (filter.from) p.set("from", filter.from);
      if (filter.to) p.set("to", filter.to);
      if (q) p.set("search", q);
      const r = await api.get(`/transactions?${p}`);
      setRows(r.items);
      setTotals(r.totals);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [filter.type, filter.account, filter.from, filter.to, q, toast]);

  useEffect(() => {
    loadAccounts();
    api.get("/transactions/options").then(setOpts).catch(() => {});
  }, [loadAccounts]);
  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const activeAccounts = accounts.filter((a) => a.isActive);

  const switchTab = (k) => {
    setTab(k);
    setForm((s) => ({ ...blank(), date: s.date, account: s.account }));
  };

  const save = async (e) => {
    e.preventDefault();
    const body = { type: tab, date: form.date, account: form.account, amount: Number(form.amount) };
    if (tab === "in") body.source = form.source;
    if (tab === "out") {
      body.category = form.category;
      if (form.payee.trim()) body.payee = form.payee.trim();
    }
    if (tab === "transfer") body.toAccount = form.toAccount;
    for (const k of ["voucherNo", "method", "transactionId", "description"]) if (form[k].trim()) body[k] = form[k].trim();
    setSaving(true);
    try {
      await api.post("/transactions", body);
      toast("Saved");
      setForm((s) => ({ ...blank(), date: s.date, account: s.account }));
      loadRows();
      loadAccounts();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Delete this entry? The account balance will change back.")) return;
    try {
      await api.del(`/transactions/${r._id}`);
      toast("Deleted");
      loadRows();
      loadAccounts();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const total = accounts.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          Transactions <span className="text-sm font-normal text-slate-500">(লেনদেন)</span>
        </h1>
        <Link to="/transactions/accounts" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Manage accounts
        </Link>
      </div>

      {/* balances */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-800">Total balance</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-900">{taka2(total)}</p>
        </div>
        {activeAccounts.map((a) => (
          <div key={a._id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="truncate text-xs text-slate-500">{a.name}</p>
            <p className={`text-lg font-semibold tabular-nums ${a.balance < 0 ? "text-red-600" : ""}`}>{taka2(a.balance)}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`-mb-px rounded-t-lg border px-4 py-2 text-sm ${
              tab === t.key ? "border-slate-200 border-b-white bg-white font-medium text-emerald-800" : "border-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label} <span className="text-xs opacity-70">({t.bn})</span>
          </button>
        ))}
      </div>

      {activeAccounts.length === 0 ? (
        <Empty>
          No account yet. <Link to="/transactions/accounts" className="text-emerald-700 underline">Add an account</Link> (cash drawer, bank, bKash...) first.
        </Empty>
      ) : (
        <form onSubmit={save} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={<L en="Date *" bn="তারিখ" />}>
              <input type="date" required className={inputCls} value={form.date} onChange={set("date")} />
            </Field>

            <Field label={tab === "in" ? <L en="Deposit account *" bn="নগদ জমার হিসাব" /> : tab === "out" ? <L en="Paid from account *" bn="খরচের হিসাব" /> : <L en="From account *" bn="যে হিসাব থেকে" />}>
              <select required className={inputCls} value={form.account} onChange={set("account")}>
                <option value="">Select account</option>
                {activeAccounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </Field>

            {tab === "in" && (
              <Field label={<L en="Source *" bn="উৎস" />}>
                <select required className={inputCls} value={form.source} onChange={set("source")}>
                  <option value="">Select source</option>
                  {opts.sources.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            )}
            {tab === "out" && (
              <>
                <Field label={<L en="Category *" bn="খরচের খাত" />}>
                  <select required className={inputCls} value={form.category} onChange={set("category")}>
                    <option value="">Select category</option>
                    {opts.categories.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label={<L en="Paid to" bn="প্রাপক" />}>
                  <input className={inputCls} value={form.payee} onChange={set("payee")} />
                </Field>
              </>
            )}
            {tab === "transfer" && (
              <Field label={<L en="To account *" bn="যে হিসাবে" />}>
                <select required className={inputCls} value={form.toAccount} onChange={set("toAccount")}>
                  <option value="">Select account</option>
                  {activeAccounts.filter((a) => a._id !== form.account).map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </Field>
            )}

            <Field label={<L en="Amount *" bn="পরিমাণ" />}>
              <input type="number" required min="0.01" step="0.01" className={inputCls} value={form.amount} onChange={set("amount")} />
            </Field>
            <Field label={<L en="Voucher / Ref No." bn="ভাউচার / রেফ নং" />}>
              <input className={inputCls} value={form.voucherNo} onChange={set("voucherNo")} />
            </Field>
            <Field label={<L en="Payment method" bn="পরিশোধ পদ্ধতি" />}>
              <select className={inputCls} value={form.method} onChange={set("method")}>
                <option value="">Select method</option>
                {opts.methods.map((m) => <option key={m} value={m}>{METHOD[m] || m}</option>)}
              </select>
            </Field>
            <Field label={<L en="Transaction ID" bn="ট্রানজেকশন আইডি" />}>
              <input className={inputCls} value={form.transactionId} onChange={set("transactionId")} />
            </Field>
            <Field label={<L en="Description" bn="বিবরণ" />} className="sm:col-span-2">
              <input className={inputCls} value={form.description} onChange={set("description")} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : <>Save <span className="text-xs opacity-80">(সেভ)</span></>}</Button>
          </div>
        </form>
      )}

      {/* list */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">All entries</h2>
        <input className={`${inputCls} sm:w-48`} placeholder="Search..." value={filter.search} onChange={(e) => setFilter((s) => ({ ...s, search: e.target.value }))} />
        <select className={`${inputCls} w-auto`} value={filter.type} onChange={(e) => setFilter((s) => ({ ...s, type: e.target.value }))}>
          <option value="">All types</option>
          {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={filter.account} onChange={(e) => setFilter((s) => ({ ...s, account: e.target.value }))}>
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
        <input type="date" className={`${inputCls} w-auto`} value={filter.from} onChange={(e) => setFilter((s) => ({ ...s, from: e.target.value }))} title="From" />
        <input type="date" className={`${inputCls} w-auto`} value={filter.to} onChange={(e) => setFilter((s) => ({ ...s, to: e.target.value }))} title="To" />
      </div>
      <p className="mb-2 text-sm text-slate-600">
        In <b className="text-emerald-700">{taka2(totals.in)}</b> · Out <b className="text-red-600">{taka2(totals.out)}</b> · Transferred <b>{taka2(totals.transfer)}</b>
      </p>

      {rows.length === 0 ? (
        <Empty>No entries found.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Details</th>
                <th className="px-3 py-2">Ref</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const t = TABS.find((x) => x.key === r.type);
                return (
                  <tr key={r._id}>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2"><Badge tone={t.tone}>{t.label.split(" /")[0]}</Badge></td>
                    <td className="px-3 py-2">{r.type === "transfer" ? `${r.account?.name} → ${r.toAccount?.name}` : r.account?.name}</td>
                    <td className="px-3 py-2">
                      <p>{r.type === "in" ? r.source : r.type === "out" ? [r.category, r.payee].filter(Boolean).join(" · ") : "Transfer"}</p>
                      {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {[r.voucherNo, r.method && (METHOD[r.method] || r.method), r.transactionId].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${r.type === "in" ? "text-emerald-700" : r.type === "out" ? "text-red-600" : ""}`}>
                      {r.type === "in" ? "+" : r.type === "out" ? "-" : ""}{taka2(r.amount)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(r)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}