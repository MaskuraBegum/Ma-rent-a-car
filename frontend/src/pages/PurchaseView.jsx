import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { dhakaToday, fmtDate, fmtPhone, taka2 } from "../utils.js";
import { PURCHASE_LABEL, PURCHASE_TONE } from "./PurchaseList.jsx";

const METHODS = [["cash", "Cash"], ["bank", "Bank"], ["bkash", "bKash"], ["nagad", "Nagad"], ["other", "Other"]];

function PaymentModal({ p, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: dhakaToday(), amount: String(p.balance), method: "cash", note: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/purchases/${p._id}/payments`, {
        date: f.date, amount: Number(f.amount), method: f.method, ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      toast("Payment saved");
      onSaved();
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  return (
    <Modal title={`Add payment · ${p.purchaseNo}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Balance: <b>{taka2(p.balance)}</b></p>
        <Field label="Date *">
          <input type="date" required className={inputCls} value={f.date} onChange={set("date")} />
        </Field>
        <Field label="Amount (৳) *">
          <input type="number" required min="0.01" max={p.balance} step="any" className={inputCls} value={f.amount} onChange={set("amount")} />
        </Field>
        <Field label="Method">
          <select className={inputCls} value={f.method} onChange={set("method")}>
            {METHODS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)">
          <input className={inputCls} value={f.note} onChange={set("note")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save payment"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PurchaseView() {
  const { id } = useParams();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => api.get(`/purchases/${id}`).then(setP).catch((e) => toast(e.message, "err")), [id, toast]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, done) => {
    try {
      await fn();
      toast(done);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const status = (to, done) => act(() => api.post(`/purchases/${id}/status`, { status: to }), done);

  if (!p) return <p className="text-sm text-slate-500">Loading...</p>;
  const hasPayments = p.payments.length > 0;
  const canPay = ["unpaid", "partial"].includes(p.status);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{p.purchaseNo}</h1>
        <Badge tone={PURCHASE_TONE[p.status]}>{PURCHASE_LABEL[p.status]}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {canPay && <Button onClick={() => setPaying(true)}>Add payment</Button>}
          {p.status === "draft" && <Button variant="secondary" onClick={() => status("unpaid", "Purchase confirmed")}>Confirm (Unpaid)</Button>}
          {p.status !== "cancelled" && <Link to={`/purchases/${id}/edit`} className={btn("secondary")}>Edit</Link>}
          {!hasPayments && p.status !== "cancelled" && (
            <Button variant="danger" onClick={() => window.confirm("Cancel this purchase?") && status("cancelled", "Purchase cancelled")}>Cancel purchase</Button>
          )}
          {p.status === "cancelled" && <Button variant="secondary" onClick={() => status("draft", "Re-opened as a draft")}>Re-open as draft</Button>}
          <Link to="/purchases" className={btn("secondary")}>← Back</Link>
        </div>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Supplier (সরবরাহকারী)</p>
          <p className="font-medium">{p.vendor?.name}{p.vendor?.companyName ? ` (${p.vendor.companyName})` : ""}</p>
          {p.vendor?.address && <p className="text-slate-600">{p.vendor.address}</p>}
          {p.vendor?.phone && <p className="text-slate-600">{fmtPhone(p.vendor.phone)}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <dt className="text-slate-500">Reference no.</dt><dd>{p.refNo || "-"}</dd>
          <dt className="text-slate-500">Date</dt><dd>{fmtDate(p.date)}</dd>
          <dt className="text-slate-500">Due date</dt><dd>{fmtDate(p.dueDate)}</dd>
        </dl>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-3 py-2">#</th><th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Discount</th><th className="px-3 py-2 text-right">VAT %</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((it, i) => (
              <tr key={it._id} className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2">{it.name}{it.description && <p className="text-xs text-slate-500">{it.description}</p>}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums">{taka2(it.rate)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{taka2(it.discount)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.vatPercent || 0}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{taka2(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm md:grid-cols-2">
        <div className="space-y-2">
          {p.notes && <div><p className="text-xs text-slate-500">Notes</p><p className="whitespace-pre-line">{p.notes}</p></div>}
          {p.footer && <div><p className="text-xs text-slate-500">Footer</p><p className="whitespace-pre-line">{p.footer}</p></div>}
        </div>
        <div className="space-y-1.5">
          <Line label="Sub total" value={taka2(p.subTotal)} />
          {p.discount > 0 && <Line label="Discount" value={`- ${taka2(p.discount)}`} />}
          {p.vatAmount > 0 && <Line label={`VAT / tax (${p.vatPercent}%)`} value={taka2(p.vatAmount)} />}
          {p.otherCharges > 0 && <Line label="Other charges" value={taka2(p.otherCharges)} />}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <span>Grand total</span><span className="tabular-nums text-emerald-800">{taka2(p.grandTotal)}</span>
          </div>
          <Line label="Paid" value={taka2(p.paidAmount)} />
          <Line label="Due" value={taka2(p.balance)} bold />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Payments</h2>
        {p.payments.length === 0 ? (
          <p className="text-sm text-slate-500">{p.status === "draft" ? "Confirm the purchase to start adding payments." : "No payments yet."}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {p.payments.map((x) => (
              <li key={x._id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">{taka2(x.amount)}</p>
                  <p className="text-xs text-slate-500">{fmtDate(x.date)} · {x.method}{x.note ? ` · ${x.note}` : ""}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => window.confirm("Delete this payment?") && act(() => api.del(`/purchases/${id}/payments/${x._id}`), "Payment deleted")}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {paying && (
        <PaymentModal p={p} onClose={() => setPaying(false)} onSaved={() => { setPaying(false); load(); }} />
      )}
    </div>
  );
}

function Line({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-slate-600">{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}