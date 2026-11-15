import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { dhakaToday, taka, taka2, toDateInput } from "../utils.js";

export const TYPES = [
  ["breakdown", "Breakdown"],
  ["service", "Regular service"],
  ["oil_change", "Oil change"],
  ["tire", "Tire"],
  ["repair", "Repair"],
  ["inspection", "Inspection"],
  ["accident", "Accident"],
  ["other", "Other"],
];
export const STATUSES = [
  ["completed", "Completed (সম্পন্ন)"],
  ["in_progress", "In progress (চলমান)"],
  ["pending", "Pending (অপেক্ষমান)"],
];
export const carLabel = (c) => `${c.registrationNo || "No plate"} · ${c.companyName} ${c.model}`;

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);

let partKey = 1;
const newPart = (o = {}) => ({ key: partKey++, name: "", quantity: "1", unitCost: "", ...o });
const blank = () => ({
  car: "", type: "breakdown", date: dhakaToday(), odometer: "", status: "completed", tripNo: "", supplierBill: "",
  cost: "", workshop: "", description: "", parts: [],
});

export default function MaintenanceForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const [cars, setCars] = useState([]);
  const [bills, setBills] = useState([]);
  const [v, setV] = useState(blank());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    api.get("/cars?limit=200").then((r) => setCars(r.items)).catch(() => {});
    api.get("/invoices?type=vendor&limit=200").then((r) => setBills(r.items.filter((b) => b.status !== "cancelled"))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/maintenance/${id}`)
      .then((l) =>
        setV({
          car: l.car?._id || "", type: l.type, date: toDateInput(l.date), odometer: l.odometer ?? "", status: l.status,
          cost: l.cost || "", workshop: l.workshop || "", description: l.description || "",
          tripNo: l.trip?.tripNo ?? "", supplierBill: l.supplierBill?._id || "",
          parts: (l.parts || []).map((p) => newPart({ name: p.name, quantity: String(p.quantity ?? 1), unitCost: p.unitCost ? String(p.unitCost) : "" })),
        })
      )
      .catch((e) => toast(e.message, "err"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const setPart = (key, patch) => setV((s) => ({ ...s, parts: s.parts.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));
  const partsTotal = v.parts.reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.unitCost) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const parts = v.parts.filter((p) => p.name.trim());
    if (v.parts.some((p) => !p.name.trim() && p.unitCost !== "")) return toast("Give each part a name", "err");
    const body = {
      car: v.car, type: v.type, date: v.date, status: v.status,
      odometer: v.odometer === "" ? (isEdit ? null : undefined) : Number(v.odometer),
      cost: v.cost === "" ? 0 : Number(v.cost),
      workshop: v.workshop.trim(),
      description: v.description.trim(),
      tripNo: v.tripNo === "" ? (isEdit ? null : undefined) : Number(v.tripNo),
      supplierBill: v.supplierBill || (isEdit ? null : undefined),
      parts: parts.map((p) => ({ name: p.name.trim(), quantity: Number(p.quantity) || 1, unitCost: Number(p.unitCost) || 0 })),
    };
    setSaving(true);
    try {
      if (isEdit) await api.patch(`/maintenance/${id}`, body);
      else await api.post("/maintenance", body);
      toast("Maintenance log saved");
      nav("/maintenance");
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{isEdit ? "Edit maintenance log (লগ সম্পাদনা)" : "New maintenance log (নতুন মেইনটেন্যান্স লগ)"}</h1>
        <Button variant="secondary" onClick={() => nav(-1)}>
          ← Go back (ফিরে যান)
        </Button>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <Field label="Vehicle (যানবাহন) *">
          <select className={inputCls} required value={v.car} onChange={set("car")}>
            <option value="">Please select</option>
            {cars.map((c) => (
              <option key={c._id} value={c._id}>
                {carLabel(c)}
                {c.isActive === false ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type (ধরন) *">
          <select className={inputCls} required value={v.type} onChange={set("type")}>
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date (তারিখ) *">
          <input type="date" required className={inputCls} value={v.date} onChange={set("date")} />
        </Field>
        <Field label="Odometer (KM) - optional">
          <input type="number" min="0" className={inputCls} value={v.odometer} onChange={set("odometer")} placeholder="Optional" />
        </Field>
        <Field label="Status (স্ট্যাটাস) *">
          <select className={inputCls} required value={v.status} onChange={set("status")}>
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cost (৳) - optional" hint={v.cost ? `${taka(v.cost)} is added to this vehicle's expenses` : "Fills the Expense and Maintenance reports"}>
          <input type="number" min="0" className={inputCls} value={v.cost} onChange={set("cost")} placeholder="0" />
        </Field>
        <Field label="Trip no. (ট্রিপ) - optional" hint="The trip it happened on, for example a breakdown during a trip">
          <input type="number" min="1" className={inputCls} value={v.tripNo} onChange={set("tripNo")} placeholder="e.g. 12" />
        </Field>
        <Field label="Supplier bill (সরবরাহকারীর বিল) - optional" hint="The vendor bill for the parts or work. Create it under Supplier > New bill">
          <select className={inputCls} value={v.supplierBill} onChange={set("supplierBill")}>
            <option value="">None</option>
            {bills.map((b) => (
              <option key={b._id} value={b._id}>
                {b.invoiceNo} · {b.billTo?.name} · {taka2(b.grandTotal)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Workshop / mechanic - optional" className="sm:col-span-2">
          <input className={inputCls} value={v.workshop} onChange={set("workshop")} />
        </Field>
        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-xs font-medium text-slate-600">Parts (যন্ত্রাংশ) - optional</p>
            {partsTotal > 0 && (
              <>
                <span className="text-xs text-slate-500">Parts total {taka2(partsTotal)}</span>
                <button type="button" className="text-xs text-emerald-700 underline" onClick={() => setV((s) => ({ ...s, cost: String(Math.round(partsTotal)) }))}>
                  Use as cost
                </button>
              </>
            )}
          </div>
          <div className="space-y-2">
            {v.parts.map((p) => (
              <div key={p.key} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
                <Field label="Part">
                  <input className={inputCls} value={p.name} onChange={(e) => setPart(p.key, { name: e.target.value })} placeholder="e.g. Brake pad" />
                </Field>
                <Field label="Qty">
                  <input type="number" min="0" step="any" className={inputCls} value={p.quantity} onChange={(e) => setPart(p.key, { quantity: e.target.value })} />
                </Field>
                <Field label="Unit cost">
                  <input type="number" min="0" step="any" className={inputCls} value={p.unitCost} onChange={(e) => setPart(p.key, { unitCost: e.target.value })} />
                </Field>
                <button type="button" className="mb-2 px-1 text-slate-400 hover:text-red-600" aria-label="Remove part" onClick={() => setV((s) => ({ ...s, parts: s.parts.filter((x) => x.key !== p.key) }))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-2" onClick={() => setV((s) => ({ ...s, parts: [...s.parts, newPart()] }))}>
            + Add part (যন্ত্রাংশ যোগ করুন)
          </Button>
        </div>
        <Field label="Description (বিবরণ)" className="sm:col-span-2">
          <textarea rows={4} className={inputCls} value={v.description} onChange={set("description")} placeholder="Work description" />
        </Field>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => nav("/maintenance")}>
          Cancel (বাতিল)
        </Button>
        <Button type="submit" disabled={saving}>
          <SaveIcon /> {saving ? "Saving..." : "Save log"}
        </Button>
      </div>
    </form>
  );
}
