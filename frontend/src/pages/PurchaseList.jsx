import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Empty, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, taka2, toDateInput, dhakaToday } from "../utils.js";

const TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "unpaid", label: "Unpaid" },
  { key: "partial", label: "Partly paid" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
];
export const PURCHASE_LABEL = { draft: "Draft", unpaid: "Unpaid", partial: "Partly paid", paid: "Paid", cancelled: "Cancelled" };
export const PURCHASE_TONE = { draft: "slate", unpaid: "amber", partial: "amber", paid: "green", cancelled: "slate" };
const PAGE_SIZE = 30;

export default function PurchaseList() {
  const toast = useToast();
  const [tab, setTab] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, totals: { billed: 0, paid: 0, balance: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/vendors?limit=200").then((r) => setVendors(r.items)).catch(() => {});
  }, []);

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
      const p = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      if (tab) p.set("status", tab);
      if (vendor) p.set("vendor", vendor);
      if (q) p.set("search", q);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      setData(await api.get(`/purchases?${p}`));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [tab, vendor, q, from, to, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const reset = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };
  const today = dhakaToday();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Purchase list (ক্রয় তালিকা)</h1>
        <Link to="/purchases/new" className={btn("primary")}>
          + New purchase
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

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className={inputCls} placeholder="Search purchase no., reference or supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={inputCls} value={vendor} onChange={reset(setVendor)}>
          <option value="">All suppliers</option>
          {vendors.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>
        <input type="date" className={inputCls} value={from} onChange={reset(setFrom)} title="From date" />
        <input type="date" className={inputCls} value={to} onChange={reset(setTo)} title="To date" />
      </div>

      <div className="mb-1 grid grid-cols-3 gap-2">
        {[
          ["Purchased", data.totals.billed],
          ["Paid", data.totals.paid],
          ["Due", data.totals.balance],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-100 px-3 py-2">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-base font-semibold tabular-nums sm:text-lg">{taka2(value)}</p>
          </div>
        ))}
      </div>
      <p className="mb-4 text-xs text-slate-500">Totals count unpaid, partly paid and paid purchases only.</p>

      {loading && data.items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : data.items.length === 0 ? (
        <Empty>No purchases found (কোনো ক্রয় পাওয়া যায়নি)</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Purchase no. (ক্রয় নং)</th>
                <th className="px-3 py-2">Supplier (সরবরাহকারী)</th>
                <th className="px-3 py-2">Date (তারিখ)</th>
                <th className="px-3 py-2 text-right">Grand total</th>
                <th className="px-3 py-2 text-right">Paid (পরিশোধিত)</th>
                <th className="px-3 py-2 text-right">Due (বাকি)</th>
                <th className="px-3 py-2">Status (অবস্থা)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p, i) => {
                const late = ["unpaid", "partial"].includes(p.status) && p.balance > 0 && toDateInput(p.dueDate) < today;
                return (
                  <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2">
                      <Link to={`/purchases/${p._id}`} className="font-medium text-emerald-800 hover:underline">
                        {p.purchaseNo}
                      </Link>
                      {p.refNo && <p className="text-xs text-slate-500">Ref {p.refNo}</p>}
                    </td>
                    <td className="px-3 py-2">{p.vendor?.name || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(p.date)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(p.grandTotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(p.paidAmount)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{taka2(p.balance)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={late ? "red" : PURCHASE_TONE[p.status]}>{late ? "Overdue" : PURCHASE_LABEL[p.status]}</Badge>
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
          <span className="text-slate-600">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
