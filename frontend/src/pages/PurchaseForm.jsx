import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { computeInvoice } from "../lib/invoice.js";
import { addDays, dhakaToday, fmtPhone, taka2, toDateInput } from "../utils.js";

let keySeq = 1;
const newItem = (o = {}) => ({ key: keySeq++, name: "", description: "", quantity: "1", rate: "", discount: "", vatPercent: "", ...o });
const cell = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);

export default function PurchaseForm() {
  const { id } = useParams();
  return <Form key={id || "new"} id={id} />;
}

function Form({ id }) {
  const isEdit = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const today = dhakaToday();

  const [f, setF] = useState({
    vendor: "", status: "draft", refNo: "", purchaseNo: "", date: today, dueDate: addDays(today, 7),
    notes: "", footer: "", discount: "", vatPercent: "", otherCharges: "", items: [newItem()],
  });
  const [vendors, setVendors] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [lockedStatus, setLockedStatus] = useState(null); // with payments the status follows them
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const numberEdited = useRef(false);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setItem = (key, patch) => setF((s) => ({ ...s, items: s.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) }));

  useEffect(() => {
    api.get(`/vendors?limit=200${isEdit ? "" : "&active=true"}`).then((r) => setVendors(r.items)).catch(() => {});
    api.get("/purchases/items").then(setCatalog).catch(() => {});
  }, [isEdit]);

  // suggest the next purchase number for the year of the date
  const year = f.date.slice(0, 4);
  useEffect(() => {
    if (isEdit || numberEdited.current || !f.date) return;
    api.get(`/purchases/next-number?date=${f.date}`).then((r) => setF((s) => ({ ...s, purchaseNo: r.purchaseNo }))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/purchases/${id}`)
      .then((p) => {
        if (p.payments.length > 0) setLockedStatus(p.status);
        setF({
          vendor: p.vendor?._id || "", status: p.status === "cancelled" ? "draft" : p.status, refNo: p.refNo || "", purchaseNo: p.purchaseNo,
          date: toDateInput(p.date), dueDate: toDateInput(p.dueDate), notes: p.notes || "", footer: p.footer || "",
          discount: p.discount ? String(p.discount) : "", vatPercent: p.vatPercent ? String(p.vatPercent) : "",
          otherCharges: p.otherCharges ? String(p.otherCharges) : "",
          items: p.items.map((it) =>
            newItem({
              name: it.name, description: it.description || "", quantity: String(it.quantity), rate: String(it.rate),
              discount: it.discount ? String(it.discount) : "", vatPercent: it.vatPercent ? String(it.vatPercent) : "",
            })
          ),
        });
      })
      .catch((e) => toast(e.message, "err"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const vendor = vendors.find((v) => v._id === f.vendor);
  const calc = useMemo(() => computeInvoice({ items: f.items, discount: f.discount, vatPercent: f.vatPercent, otherCharges: f.otherCharges }), [f]);

  const onName = (key, name) => {
    const hit = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const row = f.items.find((i) => i.key === key);
    // an item bought before fills in its last rate and description, if those boxes are still empty
    setItem(key, {
      name,
      ...(hit && !row.rate && hit.rate !== undefined ? { rate: String(hit.rate) } : {}),
      ...(hit && !row.description && hit.description ? { description: hit.description } : {}),
    });
  };

  const removeItem = (key) =>
    setF((s) => {
      const items = s.items.filter((i) => i.key !== key);
      return { ...s, items: items.length ? items : [newItem()] };
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.vendor) return toast("Choose the supplier", "err");
    if (f.dueDate < f.date) return toast("The due date cannot be before the date", "err");
    const items = f.items.filter((i) => i.name.trim() || i.rate !== "");
    if (items.length === 0) return toast("Add at least one item", "err");
    if (items.some((i) => !i.name.trim() || i.rate === "" || !(Number(i.quantity) > 0))) {
      return toast("Each item needs a name, a quantity and a rate", "err");
    }
    if (calc.grandTotal <= 0) return toast("The grand total must be more than zero", "err");

    const body = {
      vendor: f.vendor,
      ...(lockedStatus ? {} : { status: f.status }),
      purchaseNo: f.purchaseNo.trim() || undefined,
      refNo: f.refNo.trim(),
      date: f.date,
      dueDate: f.dueDate,
      notes: f.notes.trim(),
      footer: f.footer.trim(),
      discount: Number(f.discount) || 0,
      vatPercent: Number(f.vatPercent) || 0,
      otherCharges: Number(f.otherCharges) || 0,
      items: items.map((i) => ({
        name: i.name.trim(),
        ...(i.description.trim() ? { description: i.description.trim() } : {}),
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        discount: Number(i.discount) || 0,
        vatPercent: Number(i.vatPercent) || 0,
      })),
    };
    if (!body.purchaseNo) delete body.purchaseNo;

    setSaving(true);
    try {
      const p = isEdit ? await api.patch(`/purchases/${id}`, body) : await api.post("/purchases", body);
      toast(`Purchase ${p.purchaseNo} saved`);
      nav(`/purchases/${p._id}`);
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          {isEdit ? "Edit purchase (সম্পাদনা)" : "New purchase (নতুন ক্রয়)"}
        </h1>
        <Button variant="secondary" onClick={() => nav(-1)}>
          ← Go back (ফিরে যান)
        </Button>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Supplier (সরবরাহকারী) *">
            <select className={inputCls} required value={f.vendor} onChange={set("vendor")}>
              <option value="">Please select</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                  {v.companyName ? ` (${v.companyName})` : ""}
                </option>
              ))}
            </select>
          </Field>
          {vendor && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">{vendor.name}</p>
              {vendor.address && <p>{vendor.address}</p>}
              {vendor.phone && <p>{fmtPhone(vendor.phone)}</p>}
            </div>
          )}
        </div>

        <Field label="Status (স্ট্যাটাস) *" hint={lockedStatus ? "It follows the payments. Add or delete payments on the purchase page" : undefined}>
          {lockedStatus ? (
            <input className={inputCls} disabled value={lockedStatus} />
          ) : (
            <select className={inputCls} value={f.status} onChange={set("status")}>
              <option value="draft">Draft (খসড়া)</option>
              <option value="unpaid">Confirmed - Unpaid (বাকি)</option>
            </select>
          )}
        </Field>
        <Field label="Reference number (রেফারেন্স নম্বর)">
          <input className={inputCls} value={f.refNo} onChange={set("refNo")} placeholder="Supplier's bill / challan no." />
        </Field>
        <Field label="Purchase no. (ক্রয় নম্বর) *">
          <input
            className={inputCls}
            required={isEdit}
            value={f.purchaseNo}
            onChange={(e) => {
              numberEdited.current = true;
              setF((s) => ({ ...s, purchaseNo: e.target.value }));
            }}
          />
        </Field>
        <Field label="Date (তারিখ) *">
          <input type="date" required className={inputCls} value={f.date} onChange={set("date")} />
        </Field>
        <Field label="Due date (পরিশোধের তারিখ) *">
          <input type="date" required min={f.date} className={inputCls} value={f.dueDate} onChange={set("dueDate")} />
        </Field>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Items (আইটেম)</h2>

        <datalist id="purchase-item-names">
          {catalog.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="w-8 py-2 pr-2">#</th>
                <th className="w-48 px-1">Item (আইটেম)</th>
                <th className="px-1">Description (বিবরণ)</th>
                <th className="w-20 px-1">Qty (পরিমাণ)</th>
                <th className="w-24 px-1">Rate (মূল্য)</th>
                <th className="w-24 px-1">Discount (৳)</th>
                <th className="w-20 px-1">VAT %</th>
                <th className="w-28 px-1 text-right">Total (মোট)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {f.items.map((it, i) => (
                <tr key={it.key} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-2 text-slate-500">{i + 1}</td>
                  <td className="p-1">
                    <input list="purchase-item-names" className={cell} value={it.name} onChange={(e) => onName(it.key, e.target.value)} placeholder="Select or type" />
                  </td>
                  <td className="p-1">
                    <input className={cell} value={it.description} onChange={(e) => setItem(it.key, { description: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min="0" step="any" className={cell} value={it.quantity} onChange={(e) => setItem(it.key, { quantity: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min="0" step="any" className={cell} value={it.rate} onChange={(e) => setItem(it.key, { rate: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min="0" step="any" className={cell} value={it.discount} onChange={(e) => setItem(it.key, { discount: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min="0" max="100" step="any" className={cell} value={it.vatPercent} onChange={(e) => setItem(it.key, { vatPercent: e.target.value })} />
                  </td>
                  <td className="px-1 py-2 text-right font-medium tabular-nums">{taka2(calc.lines[i]?.lineTotal)}</td>
                  <td className="py-1 text-center">
                    <button type="button" onClick={() => removeItem(it.key)} className="px-1 text-slate-400 hover:text-red-600" aria-label="Remove item">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button variant="secondary" className="mt-3" onClick={() => setF((s) => ({ ...s, items: [...s.items, newItem()] }))}>
          + Add new item (নতুন আইটেম যোগ করুন)
        </Button>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Notes (নোট)">
            <textarea rows={4} className={inputCls} value={f.notes} onChange={set("notes")} />
          </Field>
          <Field label="Footer (ফুটার)">
            <textarea rows={3} className={inputCls} value={f.footer} onChange={set("footer")} />
          </Field>
        </div>

        <div className="space-y-2 self-start text-sm">
          <Row label="Sub total (সাব টোটাল)" value={taka2(calc.subTotal)} />
          <Row label="Discount (ডিসকাউন্ট ৳)">
            <input type="number" min="0" step="any" className={`${inputCls} w-32 text-right`} value={f.discount} onChange={set("discount")} placeholder="0" />
          </Row>
          <Row label="VAT / tax % (ভ্যাট)">
            <input type="number" min="0" max="100" step="any" className={`${inputCls} w-32 text-right`} value={f.vatPercent} onChange={set("vatPercent")} placeholder="0" />
          </Row>
          {calc.vatAmount > 0 && <Row label="VAT / tax amount" value={taka2(calc.vatAmount)} />}
          <Row label="Other charges (অন্যান্য ৳)">
            <input type="number" min="0" step="any" className={`${inputCls} w-32 text-right`} value={f.otherCharges} onChange={set("otherCharges")} placeholder="0" />
          </Row>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <span>Grand total (সর্বমোট)</span>
            <span className="tabular-nums text-emerald-800">{taka2(calc.grandTotal)}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => nav(-1)}>
          Cancel (বাতিল)
        </Button>
        <Button type="submit" disabled={saving}>
          <SaveIcon /> {saving ? "Saving..." : "Save purchase (সেভ ক্রয়)"}
        </Button>
      </div>
    </form>
  );
}

function Row({ label, value, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      {children || <span className="tabular-nums">{value}</span>}
    </div>
  );
}