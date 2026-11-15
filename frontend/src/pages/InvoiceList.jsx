import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Empty, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { PARTY, STATUS_LABEL, STATUS_TONE } from "../lib/invoice.js";
import { fmtDate, isOverdue, taka2 } from "../utils.js";

const TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "unpaid", label: "Unpaid" },
  { key: "partial", label: "Partly paid" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "cancelled", label: "Cancelled" },
];
const PAGE_SIZE = 30;

export default function InvoiceList() {
  const { type } = useParams();
  if (!PARTY[type]) return <Navigate to="/" replace />;
  return <List key={type} type={type} />;
}

function List({ type }) {
  const L = PARTY[type];
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState("");
  const [party, setParty] = useState("");
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, totals: { billed: 0, paid: 0, balance: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/${type === "client" ? "clients" : "vendors"}?limit=200`).then((r) => setParties(r.items)).catch(() => {});
  }, [type]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ type, limit: String(PAGE_SIZE), page: String(page) });
      if (tab === "overdue") p.set("overdue", "true");
      else if (tab) p.set("status", tab);
      if (party) p.set("party", party);
      if (q) p.set("search", q);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      setData(await api.get(`/invoices?${p}`));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [type, tab, party, q, from, to, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const reset = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          {L.word} list ({L.bn} তালিকা)
        </h1>
        <Link to={`/invoices/${type}/new`} className={btn("primary")}>
          + New {L.word.toLowerCase()}
        </Link>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
              tab === t.key ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input className={inputCls} placeholder={`Search ${L.word.toLowerCase()} no. or name`} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={inputCls} value={party} onChange={reset(setParty)}>
          <option value="">All {L.party.toLowerCase()}s</option>
          {parties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="date" className={inputCls} value={from} onChange={reset(setFrom)} title="From date" />
        <input type="date" className={inputCls} value={to} onChange={reset(setTo)} title="To date" />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          [L.total, data.totals.billed],
          [L.paid, data.totals.paid],
          [L.due, data.totals.balance],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-100 px-3 py-2">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-base font-semibold tabular-nums sm:text-lg">{taka2(value)}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 mb-4 text-xs text-slate-500">Totals count sent, partly paid and paid {L.plural.toLowerCase()} only.</p>

      {loading && data.items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : data.items.length === 0 ? (
        <Empty>
          No {L.plural.toLowerCase()} here yet. Use “New {L.word.toLowerCase()}” to create the first one.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">{L.word} no.</th>
                <th className="px-3 py-2 font-medium">{L.party}</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Payment by</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">{L.paid}</th>
                <th className="px-3 py-2 text-right font-medium">{L.due}</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((inv) => {
                const late = isOverdue(inv);
                return (
                  <tr key={inv._id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => nav(`/invoices/${type}/${inv._id}`)}>
                    <td className="px-3 py-2 font-medium text-emerald-800">{inv.invoiceNo}</td>
                    <td className="px-3 py-2">
                      {inv.billTo?.name}
                      {inv.billTo?.unitName && <span className="block text-xs text-slate-500">{inv.billTo.unitName}</span>}
                    </td>
                    <td className="px-3 py-2">{fmtDate(inv.invoiceDate)}</td>
                    <td className={`px-3 py-2 ${late ? "font-medium text-red-600" : ""}`}>{fmtDate(inv.dueDate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(inv.grandTotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(inv.paidAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inv.status === "cancelled" || inv.status === "draft" ? "-" : taka2(inv.balance)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                        {late && inv.status !== "overdue" && <Badge tone="red">Overdue</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {pages} · {data.total} {L.plural.toLowerCase()}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
