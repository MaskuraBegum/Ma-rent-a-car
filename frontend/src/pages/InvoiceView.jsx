import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { PARTY, STATUS_LABEL, STATUS_TONE } from "../lib/invoice.js";
import { dhakaToday, fmtDate, fmtPhone, isOverdue, taka2 } from "../utils.js";

const METHODS = [
  ["cash", "Cash"],
  ["bank", "Bank"],
  ["bkash", "bKash"],
  ["nagad", "Nagad"],
  ["other", "Other"],
];

export default function InvoiceView() {
  const { type, id } = useParams();
  if (!PARTY[type]) return <Navigate to="/" replace />;
  return <View key={id} type={type} id={id} />;
}

function PaymentModal({ inv, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: dhakaToday(), amount: String(inv.balance), method: "cash", note: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/invoices/${inv._id}/payments`, {
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
    <Modal title={`Add payment · ${inv.invoiceNo}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Balance: <b>{taka2(inv.balance)}</b></p>
        <Field label="Date *">
          <input type="date" required className={inputCls} value={f.date} onChange={set("date")} />
        </Field>
        <Field label="Amount (৳) *">
          <input type="number" required min="0.01" max={inv.balance} step="any" className={inputCls} value={f.amount} onChange={set("amount")} />
        </Field>
        <Field label="Method">
          <select className={inputCls} value={f.method} onChange={set("method")}>
            {METHODS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)">
          <input className={inputCls} value={f.note} onChange={set("note")} placeholder="Cheque no., bKash number..." />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel (বাতিল)
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function View({ type, id }) {
  const L = PARTY[type];
  const toast = useToast();
  const [inv, setInv] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      setInv(await api.get(`/invoices/${id}`));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, okText) => {
    try {
      await fn();
      if (okText) toast(okText);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const status = (s, text, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    act(() => api.post(`/invoices/${id}/status`, { status: s }), text);
  };

  if (!inv) return <p className="text-sm text-slate-500">Loading...</p>;

  const late = isOverdue(inv);
  const canPay = ["sent", "unpaid", "partial", "overdue"].includes(inv.status);
  const hasPayments = inv.payments.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/invoices/${type}`} className="text-sm text-emerald-700 hover:underline">
          ← {L.word} list
        </Link>
        <h1 className="ml-2 text-xl font-semibold">{inv.invoiceNo}</h1>
        <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
        {late && inv.status !== "overdue" && <Badge tone="red">Overdue</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        {inv.status === "draft" && <Button onClick={() => status("sent", `${L.word} marked as sent`)}>Mark as sent</Button>}
        {canPay && <Button onClick={() => setPaying(true)}>Add payment</Button>}
        <Button variant="secondary" onClick={() => window.open(`/api/invoices/${id}/pdf`, "_blank", "noopener")}>
          View PDF
        </Button>
        {inv.status !== "cancelled" && (
          <Link to={`/invoices/${type}/${id}/edit`} className={btn("secondary")}>
            Edit
          </Link>
        )}
        {["sent", "unpaid", "overdue"].includes(inv.status) && !hasPayments && (
          <Button variant="secondary" onClick={() => status("draft", "Back to draft")}>
            Back to draft
          </Button>
        )}
        {["draft", "sent", "unpaid", "overdue"].includes(inv.status) && !hasPayments && (
          <Button variant="danger" onClick={() => status("cancelled", `${L.word} cancelled`, `Cancel this ${L.word.toLowerCase()}? Its trips become free to bill again.`)}>
            Cancel {L.word.toLowerCase()}
          </Button>
        )}
        {inv.status === "cancelled" && <Button onClick={() => status("draft", "Re-opened as a draft")}>Re-open as draft</Button>}
      </div>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="text-sm">
          <p className="text-xs text-slate-500">{L.billTo}</p>
          <p className="text-base font-semibold">{inv.billTo?.name}</p>
          {inv.billTo?.unitName && <p>{inv.billTo.unitName}</p>}
          {inv.billTo?.address && <p className="text-slate-600">{inv.billTo.address}</p>}
          {inv.billTo?.phone && <p className="text-slate-600">{fmtPhone(inv.billTo.phone)}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">{L.word} date</dt>
          <dd className="text-right font-medium">{fmtDate(inv.invoiceDate)}</dd>
          <dt className="text-slate-500">Estimated payment date</dt>
          <dd className={`text-right font-medium ${late ? "text-red-600" : ""}`}>{fmtDate(inv.dueDate)}</dd>
          {inv.poNo && (
            <>
              <dt className="text-slate-500">P.O. / S.O. no.</dt>
              <dd className="text-right font-medium">{inv.poNo}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">Discount</th>
              <th className="px-3 py-2 text-right font-medium">VAT %</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={it._id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{it.name}</span>
                  {it.description && <span className="block text-slate-500">{it.description}</span>}
                </td>
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="text-sm">
          {inv.notes && (
            <>
              <p className="text-xs text-slate-500">Notes / terms</p>
              <p className="whitespace-pre-wrap">{inv.notes}</p>
            </>
          )}
        </div>
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          {[
            ["Sub total", inv.subTotal],
            inv.discount ? ["Discount", -inv.discount] : null,
            inv.vatAmount ? [`VAT / tax (${inv.vatPercent}%)`, inv.vatAmount] : null,
            inv.otherCharges ? ["Other charges", inv.otherCharges] : null,
          ]
            .filter(Boolean)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-600">{k}</span>
                <span className="tabular-nums">{v < 0 ? `- ${taka2(-v)}` : taka2(v)}</span>
              </div>
            ))}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums text-emerald-800">{taka2(inv.grandTotal)}</span>
          </div>
          {inv.paidAmount > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-600">{L.paid}</span>
                <span className="tabular-nums">{taka2(inv.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{L.due}</span>
                <span className="tabular-nums">{taka2(inv.balance)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Payments</h2>
        {inv.payments.length === 0 ? (
          <p className="text-sm text-slate-500">
            {inv.status === "draft" ? `Mark the ${L.word.toLowerCase()} as sent to start adding payments.` : "No payments yet."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {inv.payments.map((p) => (
              <li key={p._id} className="flex items-center gap-3 py-2">
                <span className="w-28">{fmtDate(p.date)}</span>
                <span className="flex-1 text-slate-600">
                  {METHODS.find(([v]) => v === p.method)?.[1] || p.method}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-medium tabular-nums">{taka2(p.amount)}</span>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => window.confirm("Delete this payment?") && act(() => api.del(`/invoices/${id}/payments/${p._id}`), "Payment deleted")}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {paying && (
        <PaymentModal
          inv={inv}
          onClose={() => setPaying(false)}
          onSaved={() => {
            setPaying(false);
            load();
          }}
        />
      )}
    </div>
  );
}
