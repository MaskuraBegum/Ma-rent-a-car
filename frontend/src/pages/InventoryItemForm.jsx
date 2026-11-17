import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const blank = { name: "", sku: "", category: "", unit: "", currentStock: "0", minStock: "0", purchasePrice: "0", salePrice: "0", assetAccount: "Parts in stock", note: "", isActive: true };
const gear = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// the small "+" box next to Category and Unit: add one without leaving the form
function QuickAdd({ kind, onClose, onAdded }) {
  const toast = useToast();
  const isUnit = kind === "units";
  const [f, setF] = useState({ name: "", shortName: "" });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const doc = await api.post(`/inventory/${kind}`, isUnit ? f : { name: f.name });
      toast(`${isUnit ? "Unit" : "Category"} added`);
      onAdded(doc);
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  return (
    <Modal title={isUnit ? "Add unit (একক)" : "Add category (ক্যাটাগরি)"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name *">
          <input required autoFocus className={inputCls} value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder={isUnit ? "e.g. Meter" : "e.g. Filter"} />
        </Field>
        {isUnit && (
          <Field label="Short form *">
            <input required maxLength={12} className={inputCls} value={f.shortName} onChange={(e) => setF((s) => ({ ...s, shortName: e.target.value }))} placeholder="e.g. m" />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Adding..." : "+ Add"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryItemForm() {
  const { id } = useParams();
  const [round, setRound] = useState(0); // "Save & Add More" starts a fresh form
  return <Form key={`${id || "new"}-${round}`} id={id} onAgain={() => setRound((n) => n + 1)} />;
}

function Form({ id, onAgain }) {
  const isEdit = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [cats, setCats] = useState([]);
  const [units, setUnits] = useState([]);
  const [accounts, setAccounts] = useState(["Parts in stock"]);
  const [adding, setAdding] = useState(null); // "categories" | "units"
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    api.get("/inventory/categories").then((r) => setCats(r.items)).catch(() => {});
    api.get("/inventory/units").then((r) => setUnits(r.items)).catch(() => {});
    api.get("/inventory/accounts").then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/inventory/items/${id}`)
      .then((it) =>
        setF({
          name: it.name, sku: it.sku || "", category: it.category?._id || "", unit: it.unit?._id || "",
          currentStock: String(it.currentStock), minStock: String(it.minStock), purchasePrice: String(it.purchasePrice),
          salePrice: String(it.salePrice), assetAccount: it.assetAccount, note: it.note || "", isActive: it.isActive,
        })
      )
      .catch((e) => toast(e.message, "err"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const save = async (again) => {
    if (!f.name.trim()) return toast("Item name is required", "err");
    if (!f.category) return toast("Choose a category", "err");
    if (!f.unit) return toast("Choose a unit", "err");
    const body = {
      name: f.name.trim(),
      sku: f.sku.trim(),
      category: f.category,
      unit: f.unit,
      currentStock: Number(f.currentStock) || 0,
      minStock: Number(f.minStock) || 0,
      purchasePrice: Number(f.purchasePrice) || 0,
      salePrice: Number(f.salePrice) || 0,
      assetAccount: f.assetAccount,
      note: f.note.trim(),
      isActive: f.isActive,
    };
    setSaving(true);
    try {
      if (isEdit) await api.patch(`/inventory/items/${id}`, body);
      else await api.post("/inventory/items", body);
      toast(isEdit ? "Item saved" : "Item created");
      if (again && !isEdit) onAgain();
      else nav("/inventory/items");
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  const activeOnly = (list, current) => list.filter((x) => x.isActive || x._id === current);

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{isEdit ? "Edit inventory item" : "New inventory item (নতুন ইনভেন্টরি আইটেম)"}</h1>
        <Button variant="secondary" onClick={() => nav(-1)}>← Go back (ফিরে যান)</Button>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <Field label="Item name (আইটেমের নাম) *">
          <input required className={inputCls} value={f.name} onChange={set("name")} />
        </Field>
        <Field label="SKU / item code (optional)">
          <input className={inputCls} value={f.sku} onChange={set("sku")} />
        </Field>

        <Field label="Category (ক্যাটাগরি) *">
          <div className="flex gap-2">
            <select required className={inputCls} value={f.category} onChange={set("category")}>
              <option value="">Please select</option>
              {activeOnly(cats, f.category).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <Button variant="secondary" className="px-3" onClick={() => setAdding("categories")} aria-label="Add category">{gear}</Button>
          </div>
        </Field>
        <Field label="Unit (একক) *">
          <div className="flex gap-2">
            <select required className={inputCls} value={f.unit} onChange={set("unit")}>
              <option value="">Please select</option>
              {activeOnly(units, f.unit).map((u) => <option key={u._id} value={u._id}>{u.name} ({u.shortName})</option>)}
            </select>
            <Button variant="secondary" className="px-3" onClick={() => setAdding("units")} aria-label="Add unit">{gear}</Button>
          </div>
        </Field>

        <Field label="Current stock (বর্তমান স্টক)" hint={isEdit ? undefined : "What you have now. Use 0 if empty"}>
          <input type="number" min="0" step="any" className={inputCls} value={f.currentStock} onChange={set("currentStock")} />
        </Field>
        <Field label="Minimum stock - alert (সর্বনিম্ন স্টক)">
          <input type="number" min="0" step="any" className={inputCls} value={f.minStock} onChange={set("minStock")} />
        </Field>
        <Field label="Default purchase price (৳)">
          <input type="number" min="0" step="any" className={inputCls} value={f.purchasePrice} onChange={set("purchasePrice")} />
        </Field>
        <Field label="Default sale price (৳)">
          <input type="number" min="0" step="any" className={inputCls} value={f.salePrice} onChange={set("salePrice")} />
        </Field>

        <Field label="Asset account - for accounting *" className="sm:col-span-2">
          <select required className={inputCls} value={f.assetAccount} onChange={set("assetAccount")}>
            {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Note (নোট)" className="sm:col-span-2">
          <textarea rows={3} className={inputCls} value={f.note} onChange={set("note")} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF((s) => ({ ...s, isActive: e.target.checked }))} />
          Active (সক্রিয়)
        </label>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => nav("/inventory/items")}>Cancel (বাতিল)</Button>
        {!isEdit && <Button variant="secondary" disabled={saving} onClick={() => save(true)}>Save &amp; add more</Button>}
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save item" : "Create item"}</Button>
      </div>

      {adding && (
        <QuickAdd
          kind={adding}
          onClose={() => setAdding(null)}
          onAdded={(doc) => {
            if (adding === "categories") { setCats((l) => [...l, doc]); setF((s) => ({ ...s, category: doc._id })); }
            else { setUnits((l) => [...l, doc]); setF((s) => ({ ...s, unit: doc._id })); }
            setAdding(null);
          }}
        />
      )}
    </form>
  );
}