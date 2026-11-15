import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import ActionMenu from "../components/ActionMenu.jsx";
import { Badge, Button, btn, Empty, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, taka, taka2 } from "../utils.js";
import { STATUSES, TYPES, carLabel } from "./MaintenanceForm.jsx";

const PAGE_SIZE = 30;
const STATUS_TONE = { completed: "green", in_progress: "amber", pending: "slate" };
const TYPE_TONE = { breakdown: "red", accident: "red", repair: "amber", tire: "blue", service: "green", oil_change: "green", inspection: "slate", other: "slate" };
const label = (list, v) => list.find(([k]) => k === v)?.[1] || v;
const BILL_TONE = { sent: "blue", unpaid: "amber", partial: "amber", paid: "green", overdue: "red", draft: "slate" };

function Parts({ parts }) {
  if (!parts?.length) return <span className="text-slate-400">-</span>;
  const names = parts.slice(0, 2).map((p) => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name));
  return (
    <span title={parts.map((p) => `${p.name} ×${p.quantity}`).join(", ")}>
      <span className="font-medium">{parts.length} part{parts.length > 1 ? "s" : ""}</span>
      <span className="block max-w-[11rem] truncate text-xs text-slate-500">
        {names.join(", ")}
        {parts.length > 2 ? ` +${parts.length - 2}` : ""}
      </span>
    </span>
  );
}

export default function MaintenanceList() {
  const toast = useToast();
  const [cars, setCars] = useState([]);
  const [f, setF] = useState({ car: "", type: "", status: "", from: "", to: "", active: "true" });
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setPage(1);
  };

  useEffect(() => {
    api.get("/cars?limit=200").then((r) => setCars(r.items)).catch(() => {});
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
      for (const [k, v] of Object.entries(f)) if (v && !(k === "active" && v === "all")) p.set(k, v);
      if (q) p.set("search", q);
      setData(await api.get(`/maintenance?${p}`));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [f, q, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, text) => {
    try {
      await fn();
      toast(text);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const cost = data.items.filter((l) => l.isActive).reduce((s, l) => s + (l.cost || 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Maintenance log list (মেইনটেন্যান্স লগ তালিকা)</h1>
        <Link to="/maintenance/new" className={btn("primary")}>
          + New Log (নতুন লগ)
        </Link>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select className={inputCls} value={f.car} onChange={set("car")}>
          <option value="">All vehicles</option>
          {cars.map((c) => (
            <option key={c._id} value={c._id}>
              {carLabel(c)}
            </option>
          ))}
        </select>
        <select className={inputCls} value={f.type} onChange={set("type")}>
          <option value="">All types</option>
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select className={inputCls} value={f.status} onChange={set("status")}>
          <option value="">All statuses</option>
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input type="date" className={inputCls} value={f.from} onChange={set("from")} title="From date" />
        <input type="date" className={inputCls} value={f.to} onChange={set("to")} title="To date" />
        <select className={inputCls} value={f.active} onChange={set("active")}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="all">All</option>
        </select>
        <input className={`${inputCls} sm:col-span-3 lg:col-span-6`} placeholder="Search reference, description or workshop" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {data.items.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {data.total} log{data.total > 1 ? "s" : ""} · Cost on this page: <b>{taka(cost)}</b>
        </p>
      )}

      {loading && data.items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : data.items.length === 0 ? (
        <Empty>No maintenance logs found. Use “New Log” to add the first one.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Ref</th>
                <th className="px-3 py-2 font-medium">Vehicle (যানবাহন)</th>
                <th className="px-3 py-2 font-medium">Trip (ট্রিপ)</th>
                <th className="px-3 py-2 font-medium">Type (ধরন)</th>
                <th className="px-3 py-2 font-medium">Date (তারিখ)</th>
                <th className="px-3 py-2 text-right font-medium">Odometer (ওডোমিটার)</th>
                <th className="px-3 py-2 font-medium">Parts (যন্ত্রাংশ)</th>
                <th className="px-3 py-2 font-medium">Supplier bill (সরবরাহকারীর বিল)</th>
                <th className="px-3 py-2 font-medium">Status (অবস্থা)</th>
                <th className="px-3 py-2 font-medium">Actions (কার্যক্রম)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((l, i) => {
                const menu = [
                  { label: "Edit", to: `/maintenance/${l._id}/edit` },
                  ...(l.supplierBill ? [{ label: "View supplier bill", to: `/invoices/vendor/${l.supplierBill._id}` }] : []),
                  l.isActive
                    ? { label: "Deactivate", danger: true, onClick: () => window.confirm("Deactivate this log? Its cost leaves the expense reports.") && act(() => api.del(`/maintenance/${l._id}`), "Deactivated") }
                    : { label: "Activate", onClick: () => act(() => api.patch(`/maintenance/${l._id}`, { isActive: true }), "Activated") },
                ];
                return (
                  <tr key={l._id} className={`border-t border-slate-100 align-top ${l.isActive ? "" : "opacity-60"}`}>
                    <td className="px-3 py-2 text-slate-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-emerald-800">{l.refNo || "-"}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{l.car?.registrationNo || "No plate"}</span>
                      {l.car && <span className="block text-xs text-slate-500">{l.car.companyName} {l.car.model}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {l.trip ? (
                        <span title={l.trip.location}>
                          #{l.trip.tripNo}
                          <span className="block max-w-[9rem] truncate text-xs text-slate-500">{l.trip.location}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={TYPE_TONE[l.type]}>{label(TYPES, l.type)}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(l.date)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{l.odometer != null ? `${l.odometer.toLocaleString("en-US")} km` : "-"}</td>
                    <td className="px-3 py-2">
                      <Parts parts={l.parts} />
                    </td>
                    <td className="px-3 py-2">
                      {l.supplierBill ? (
                        <Link to={`/invoices/vendor/${l.supplierBill._id}`} className="text-emerald-800 hover:underline">
                          {l.supplierBill.invoiceNo}
                          <span className="block text-xs text-slate-500">
                            {taka2(l.supplierBill.grandTotal)} · <Badge tone={BILL_TONE[l.supplierBill.status]}>{l.supplierBill.status}</Badge>
                          </span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[l.status]}>{label(STATUSES, l.status)}</Badge>
                      {!l.isActive && <span className="mt-1 block"><Badge>Inactive</Badge></span>}
                    </td>
                    <td className="px-3 py-2">
                      <ActionMenu items={menu} />
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
