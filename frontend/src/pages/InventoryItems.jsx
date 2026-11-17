import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Empty, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { taka2 } from "../utils.js";

const PAGE_SIZE = 30;
const num = (n) => Number(n || 0).toLocaleString("en-US");

export default function InventoryItems() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("");
  const [low, setLow] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/inventory/categories").then((r) => setCategories(r.items)).catch(() => {});
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
      if (q) p.set("search", q);
      if (category) p.set("category", category);
      if (active) p.set("active", active);
      if (low) p.set("low", "true");
      setData(await api.get(`/inventory/items?${p}`));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [q, category, active, low, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (it) => {
    try {
      await api.patch(`/inventory/items/${it._id}`, { isActive: !it.isActive });
      toast(it.isActive ? "Deactivated" : "Activated");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const remove = async (it) => {
    if (!window.confirm(`Delete "${it.name}"?`)) return;
    try {
      await api.del(`/inventory/items/${it._id}`);
      toast("Item deleted");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const reset = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Inventory items (ইনভেন্টরি আইটেম)</h1>
        <Link to="/inventory/items/new" className={btn("primary")}>
          + New item (নতুন আইটেম)
        </Link>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className={inputCls} placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={inputCls} value={category} onChange={reset(setCategory)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <select className={inputCls} value={active} onChange={reset(setActive)}>
          <option value="">Active and inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <input type="checkbox" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
      </div>

      {loading && data.items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : data.items.length === 0 ? (
        <Empty>No inventory items found</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Account head</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 text-right">Current stock</th>
                <th className="px-3 py-2 text-right">Minimum stock</th>
                <th className="px-3 py-2 text-right">Purchase price</th>
                <th className="px-3 py-2 text-right">Sale price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => {
                const lowStock = it.minStock > 0 && it.currentStock <= it.minStock;
                return (
                  <tr key={it._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2 font-medium">{it.name}</td>
                    <td className="px-3 py-2 text-slate-600">{it.assetAccount}</td>
                    <td className="px-3 py-2 text-slate-600">{it.sku || "-"}</td>
                    <td className="px-3 py-2">{it.category?.name || "-"}</td>
                    <td className="px-3 py-2">{it.unit?.shortName || "-"}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${lowStock ? "font-semibold text-red-600" : ""}`}>
                      {num(it.currentStock)}
                      {lowStock && <span className="ml-1 text-xs">low</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(it.minStock)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(it.purchasePrice)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{taka2(it.salePrice)}</td>
                    <td className="px-3 py-2"><Badge tone={it.isActive ? "green" : "slate"}>{it.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className="w-40 px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link to={`/inventory/items/${it._id}/edit`} className={btn("secondary", "px-2 py-1 text-xs")}>Edit</Link>
                        <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => toggle(it)}>{it.isActive ? "Deactivate" : "Activate"}</Button>
                        <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => remove(it)}>Delete</Button>
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
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-slate-600">Page {page} of {pages}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}