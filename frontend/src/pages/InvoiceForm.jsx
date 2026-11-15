import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import TripPicker from "../components/TripPicker.jsx";
import { useToast } from "../components/Toast.jsx";
import { PARTY, STATUS_LABEL, computeInvoice, statusOptions } from "../lib/invoice.js";
import { addDays, dhakaToday, fmtPhone, taka2, toDateInput } from "../utils.js";

let keySeq = 1;
const newItem = (o = {}) => ({ key: keySeq++, name: "", description: "", quantity: "1", rate: "", discount: "", vatPercent: "", trip: undefined, ...o });

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);

export default function InvoiceForm() {
  const { type, id } = useParams();
  if (!PARTY[type]) return <Navigate to="/" replace />;
  return <Form key={`${type}-${id || "new"}`} type={type} id={id} />;
}

function Form({ type, id }) {
  const L = PARTY[type];
  const isEdit = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const today = dhakaToday();

  const [f, setF] = useState({
    party: "", unitId: "", status: "draft", poNo: "", invoiceNo: "", invoiceDate: today, dueDate: addDays(today, 7),
    notes: "", discount: "", vatPercent: "", otherCharges: "", items: [newItem()],
    receivedAmount: "", receivedDate: "", receivedMethod: "cash", // for the status Partial and Paid
  });
  const [parties, setParties] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [lockedStatus, setLockedStatus] = useState(null); // an invoice with payments (status follows the payments) or a cancelled one: changed on the invoice page
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const numberEdited = useRef(false);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setItem = (key, patch) => setF((s) => ({ ...s, items: s.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) }));

  useEffect(() => {
    api.get(`/${type === "client" ? "clients" : "vendors"}?limit=200${isEdit ? "" : "&active=true"}`).then((r) => setParties(r.items)).catch(() => {});
    api.get(`/invoices/items?type=${type}`).then(setCatalog).catch(() => {});
  }, [type, isEdit]);

  // suggest the next invoice number for the year of the invoice date
  const year = f.invoiceDate.slice(0, 4);
  useEffect(() => {
    if (isEdit || numberEdited.current || !f.invoiceDate) return;
    api.get(`/invoices/next-number?type=${type}&date=${f.invoiceDate}`).then((r) => setF((s) => ({ ...s, invoiceNo: r.invoiceNo }))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, year, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/invoices/${id}`)
      .then((inv) => {
        if (inv.payments.length > 0 || inv.status === "cancelled") setLockedStatus(inv.status);
        setF({
          party: inv.client || inv.vendor || "",
          unitId: inv.unitId || "",
          status: inv.status,
          poNo: inv.poNo || "",
          invoiceNo: inv.invoiceNo,
          invoiceDate: toDateInput(inv.invoiceDate),
          dueDate: toDateInput(inv.dueDate),
          notes: inv.notes || "",
          discount: inv.discount ? String(inv.discount) : "",
          vatPercent: inv.vatPercent ? String(inv.vatPercent) : "",
          otherCharges: inv.otherCharges ? String(inv.otherCharges) : "",
          items: inv.items.map((it) =>
            newItem({
              name: it.name, description: it.description || "", quantity: String(it.quantity), rate: String(it.rate),
              discount: it.discount ? String(it.discount) : "", vatPercent: it.vatPercent ? String(it.vatPercent) : "", trip: it.trip || undefined,
            })
          ),
        });
      })
      .catch((e) => toast(e.message, "err"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const party = parties.find((p) => p._id === f.party);
  const unit = party?.units?.find((u) => u._id === f.unitId);
  const calc = useMemo(() => computeInvoice({ items: f.items, discount: f.discount, vatPercent: f.vatPercent, otherCharges: f.otherCharges }), [f]);
  const takenTrips = useMemo(() => new Set(f.items.map((i) => i.trip).filter(Boolean)), [f.items]);

  const onName = (key, name) => {
    const hit = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const row = f.items.find((i) => i.key === key);
    // a name used before fills in its last rate and description, if those boxes are still empty
    setItem(key, {
      name,
      ...(hit && !row.rate && hit.rate !== undefined ? { rate: String(hit.rate) } : {}),
      ...(hit && !row.description && hit.description ? { description: hit.description } : {}),
    });
  };

  const addTrips = (trips) => {
    const name = type === "client" ? "Car rental" : "Rented car";
    const rows = trips.map((t) => newItem({ name, description: t.description, quantity: "1", rate: String(t.amount ?? 0), trip: t._id }));
    setF((s) => {
      const onlyBlank = s.items.length === 1 && !s.items[0].name && !s.items[0].rate;
      return { ...s, items: onlyBlank ? rows : [...s.items, ...rows] };
    });
    setPicker(false);
    toast(`${trips.length} trip${trips.length > 1 ? "s" : ""} added`);
  };

  const removeItem = (key) =>
    setF((s) => {
      const items = s.items.filter((i) => i.key !== key);
      return { ...s, items: items.length ? items : [newItem()] };
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.party) return toast(`Choose the ${L.party.toLowerCase()}`, "err");
    if (f.dueDate < f.invoiceDate) return toast("The estimated payment date cannot be before the date", "err");
    const items = f.items.filter((i) => i.name.trim() || i.rate !== "");
    if (items.length === 0) return toast("Add at least one item", "err");
    if (items.some((i) => !i.name.trim() || i.rate === "" || !(Number(i.quantity) > 0))) {
      return toast("Each item needs a name, a quantity and a rate", "err");
    }
    if (calc.grandTotal <= 0) return toast("The grand total must be more than zero", "err");
    if (!lockedStatus && f.status === "overdue" && f.dueDate >= today) {
      return toast("Overdue needs an estimated payment date that has already passed", "err");
    }
    if (!lockedStatus && f.status === "partial") {
      const got = Number(f.receivedAmount);
      if (!(got > 0) || got >= calc.grandTotal) return toast("For Partial, enter an amount received that is less than the grand total", "err");
    }

    const body = {
      ...(isEdit ? {} : { type }),
      party: f.party,
      ...(f.unitId ? { unitId: f.unitId } : {}),
      ...(lockedStatus ? {} : { status: f.status }),
      ...(!lockedStatus && ["partial", "paid"].includes(f.status)
        ? {
            received: {
              ...(f.status === "partial" ? { amount: Number(f.receivedAmount) } : {}),
              ...(f.receivedDate ? { date: f.receivedDate } : {}),
              method: f.receivedMethod,
            },
          }
        : {}),
      invoiceNo: f.invoiceNo.trim() || undefined,
      poNo: f.poNo.trim(),
      invoiceDate: f.invoiceDate,
      dueDate: f.dueDate,
      notes: f.notes.trim(),
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
        ...(i.trip ? { trip: i.trip } : {}),
      })),
    };
    if (isEdit && !body.invoiceNo) delete body.invoiceNo;

    setSaving(true);
    try {
      const inv = isEdit ? await api.patch(`/invoices/${id}`, body) : await api.post("/invoices", body);
      toast(`${L.word} ${inv.invoiceNo} saved`);
      nav(`/invoices/${type}/${inv._id}`);
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">
          {isEdit ? `Edit ${L.word.toLowerCase()}` : `Create ${L.word.toLowerCase()}`} ({isEdit ? "সম্পাদনা" : `${L.bn} তৈরি করুন`})
        </h1>
        <Button variant="secondary" onClick={() => nav(-1)}>
          ← Go back (ফিরে যান)
        </Button>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={`${L.billTo} - ${L.party} (${L.partyBn}) *`}>
            <select
              className={inputCls}
              required
              value={f.party}
              onChange={(e) => setF((s) => ({ ...s, party: e.target.value, unitId: "" }))}
            >
              <option value="">Please select</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.companyName ? ` (${p.companyName})` : ""}
                  {p.type ? ` - ${p.type}` : ""}
                </option>
              ))}
            </select>
          </Field>
          {party?.units?.length > 0 && (
            <Field label="Unit (optional)" className="mt-3">
              <select className={inputCls} value={f.unitId} onChange={set("unitId")}>
                <option value="">Whole company</option>
                {party.units.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {party && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">
                {party.name}
                {unit ? ` · ${unit.name}` : ""}
              </p>
              {(unit?.address || party.address) && <p>{unit?.address || party.address}</p>}
              {(unit?.phone || party.phone) && <p>{fmtPhone(unit?.phone || party.phone)}</p>}
            </div>
          )}
        </div>

        <Field label="Status (স্ট্যাটাস) *" hint={lockedStatus ? "It follows the payments. Add or delete payments on the invoice page" : undefined}>
          {lockedStatus ? (
            <input className={inputCls} disabled value={STATUS_LABEL[lockedStatus]} />
          ) : (
            <select className={inputCls} value={f.status} onChange={set("status")}>
              {statusOptions(type).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="P.O. / S.O. number (optional)">
          <input className={inputCls} value={f.poNo} onChange={set("poNo")} />
        </Field>
        <Field label={`${L.word} no. *`}>
          <input
            className={inputCls}
            required={isEdit}
            value={f.invoiceNo}
            onChange={(e) => {
              numberEdited.current = true;
              setF((s) => ({ ...s, invoiceNo: e.target.value }));
            }}
          />
        </Field>
        <Field label={`${L.word} date (তারিখ) *`}>
          <input type="date" required className={inputCls} value={f.invoiceDate} onChange={set("invoiceDate")} />
        </Field>
        <Field label="Estimated payment date (আনুমানিক পরিশোধের তারিখ) *">
          <input type="date" required min={f.invoiceDate} className={inputCls} value={f.dueDate} onChange={set("dueDate")} />
        </Field>

        {!lockedStatus && f.status === "overdue" && f.dueDate >= today && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
            Overdue needs an estimated payment date that has already passed. Change the date above, or choose Unpaid.
          </p>
        )}

        {!lockedStatus && ["partial", "paid"].includes(f.status) && (
          <div className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:col-span-2 sm:grid-cols-3">
            <p className="text-sm font-medium text-emerald-900 sm:col-span-3">
              {f.status === "paid" ? `Paid: the whole total ${taka2(calc.grandTotal)} is recorded as received` : "Partial: record what has been received so far"}
            </p>
            {f.status === "partial" && (
              <Field label="Amount received (৳) *" hint={calc.grandTotal > 0 ? `Balance after this: ${taka2(Math.max(calc.grandTotal - (Number(f.receivedAmount) || 0), 0))}` : undefined}>
                <input type="number" min="0.01" step="any" className={inputCls} value={f.receivedAmount} onChange={set("receivedAmount")} />
              </Field>
            )}
            <Field label="Received on" hint="Empty = the invoice date">
              <input type="date" className={inputCls} value={f.receivedDate} onChange={set("receivedDate")} />
            </Field>
            <Field label="Method">
              <select className={inputCls} value={f.receivedMethod} onChange={set("receivedMethod")}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-semibold">Items (আইটেম)</h2>
          {f.party && (
            <Button variant="secondary" onClick={() => setPicker(true)}>
              Add completed trips
            </Button>
          )}
        </div>

        <datalist id="item-names">
          {catalog.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>

        <div className="space-y-3">
          {f.items.map((it, i) => (
            <div key={it.key} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  #{i + 1}
                  {it.trip && " · from a trip"}
                </span>
                <button type="button" onClick={() => removeItem(it.key)} className="px-1 text-slate-400 hover:text-red-600" aria-label="Remove item">
                  ✕
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-6">
                <Field label="Item (আইটেম) *" className="sm:col-span-2">
                  <input list="item-names" className={inputCls} value={it.name} onChange={(e) => onName(it.key, e.target.value)} placeholder="e.g. Car rental" />
                </Field>
                <Field label="Description (বিবরণ)" className="sm:col-span-4">
                  <input className={inputCls} value={it.description} onChange={(e) => setItem(it.key, { description: e.target.value })} />
                </Field>
                <Field label="Quantity (পরিমাণ) *">
                  <input type="number" min="0" step="any" className={inputCls} value={it.quantity} onChange={(e) => setItem(it.key, { quantity: e.target.value })} />
                </Field>
                <Field label="Rate (মূল্য) *">
                  <input type="number" min="0" step="any" className={inputCls} value={it.rate} onChange={(e) => setItem(it.key, { rate: e.target.value })} />
                </Field>
                <Field label="Discount (ডিসকাউন্ট ৳)">
                  <input type="number" min="0" step="any" className={inputCls} value={it.discount} onChange={(e) => setItem(it.key, { discount: e.target.value })} />
                </Field>
                <Field label="VAT % (ভ্যাট)">
                  <input type="number" min="0" max="100" step="any" className={inputCls} value={it.vatPercent} onChange={(e) => setItem(it.key, { vatPercent: e.target.value })} />
                </Field>
                <p className="self-end pb-2 text-right text-sm sm:col-span-2">
                  <span className="text-slate-500">Total </span>
                  <b className="tabular-nums">{taka2(calc.lines[i]?.lineTotal)}</b>
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="secondary" className="mt-3" onClick={() => setF((s) => ({ ...s, items: [...s.items, newItem()] }))}>
          + Add new item (নতুন আইটেম যোগ করুন)
        </Button>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <Field label="Notes / terms (optional)" hint="Shown on the PDF for your customer">
          <textarea rows={6} className={inputCls} value={f.notes} onChange={set("notes")} placeholder="Enter notes or terms of service visible to your customer" />
        </Field>

        <div className="space-y-2 text-sm">
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
          <p className="text-xs text-slate-500">
            Item total = quantity × rate − item discount + item VAT. The discount comes off the sub total, then the VAT % is added on what is left.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => nav(-1)}>
          Cancel (বাতিল)
        </Button>
        <Button type="submit" disabled={saving}>
          <SaveIcon /> {saving ? "Saving..." : `Save ${L.word.toLowerCase()} (সেভ ${L.bn})`}
        </Button>
      </div>

      {picker && (
        <TripPicker
          type={type}
          party={f.party}
          unitId={f.unitId}
          exclude={isEdit ? id : undefined}
          taken={takenTrips}
          onClose={() => setPicker(false)}
          onAdd={addTrips}
        />
      )}
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
