import { useState } from "react";
import { api } from "../api.js";
import { Button, Field, inputCls, Modal } from "./ui.jsx";
import { useToast } from "./Toast.jsx";
import { dhakaToday, taka2 } from "../utils.js";

const KINDS = [
  ["payment", "Payment (পরিশোধ) - money we paid"],
  ["opening", "Opening balance (শুরুর হিসাব) - owed before this system"],
  ["adjustment", "Adjustment (সমন্বয়) - correction, fine or bonus"],
];

// One window for the three things typed by hand: a payment, an opening balance and an adjustment.
export default function LedgerEntryModal({ type, party, balance = 0, kind = "payment", onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    kind,
    date: dhakaToday(),
    amount: kind === "payment" && balance > 0 ? String(balance) : "",
    method: "cash",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const isPayment = f.kind === "payment";

  const save = async (e) => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!amount) return toast("Enter the amount", "err");
    setSaving(true);
    try {
      await api.post(`/ledger/${type}/${party._id}/entries`, {
        kind: f.kind, date: f.date, amount, ...(isPayment ? { method: f.method } : {}), ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      toast("Saved");
      onSaved();
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  const after = isPayment ? balance - (Number(f.amount) || 0) : balance + (Number(f.amount) || 0);

  return (
    <Modal title={`${party.name} · account`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {balance >= 0 ? "We owe now" : "Paid ahead"}: <b>{taka2(Math.abs(balance))}</b>
        </p>
        <Field label="What is this? *">
          <select className={inputCls} value={f.kind} onChange={set("kind")}>
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date *">
          <input type="date" required className={inputCls} value={f.date} onChange={set("date")} />
        </Field>
        <Field
          label="Amount (৳) *"
          hint={isPayment ? undefined : "A plus amount means we owe more. A minus amount means we owe less (or paid ahead)."}
        >
          <input type="number" required step="any" min={isPayment ? "0.01" : undefined} className={inputCls} value={f.amount} onChange={set("amount")} />
        </Field>
        {isPayment && (
          <Field label="Method">
            <select className={inputCls} value={f.method} onChange={set("method")}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="other">Other</option>
            </select>
          </Field>
        )}
        <Field label={f.kind === "adjustment" ? "Note *" : "Note (optional)"}>
          <input className={inputCls} required={f.kind === "adjustment"} value={f.note} onChange={set("note")} placeholder={isPayment ? "e.g. advance for the week" : ""} />
        </Field>
        {Number(f.amount) !== 0 && f.amount !== "" && (
          <p className="text-sm text-slate-600">
            After this: {after >= 0 ? "we owe" : "paid ahead"} <b>{taka2(Math.abs(after))}</b>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel (বাতিল)
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}