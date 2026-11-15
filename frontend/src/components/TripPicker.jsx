import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Button, Field, inputCls, Modal } from "./ui.jsx";
import { useToast } from "./Toast.jsx";
import { fmtDate, taka2 } from "../utils.js";

// Lists completed trips that are not on an invoice yet, so they can be added as items in one click.
// Client invoice: the trip rent. Vendor bill: the vendor's share.
export default function TripPicker({ type, party, unitId, exclude, taken, onClose, onAdd }) {
  const toast = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trips, setTrips] = useState(null);
  const [picked, setPicked] = useState(new Set());

  useEffect(() => {
    const p = new URLSearchParams({ type, party });
    if (unitId) p.set("unit", unitId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (exclude) p.set("exclude", exclude);
    setTrips(null);
    api.get(`/invoices/trips?${p}`).then(setTrips).catch((e) => {
      toast(e.message, "err");
      setTrips([]);
    });
  }, [type, party, unitId, from, to, exclude, toast]);

  // trips already added as items in this form are left out
  const list = useMemo(() => (trips || []).filter((t) => !taken.has(t._id)), [trips, taken]);
  const total = list.filter((t) => picked.has(t._id)).reduce((s, t) => s + (t.amount || 0), 0);

  const toggle = (id) =>
    setPicked((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allSelected = list.length > 0 && list.every((t) => picked.has(t._id));

  return (
    <Modal title="Add completed trips" onClose={onClose} wide>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Field label="From date">
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To date">
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {trips === null ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No completed trips waiting to be billed for this {type === "client" ? "client" : "vendor"}.
        </p>
      ) : (
        <>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-700"
              checked={allSelected}
              onChange={() => setPicked(allSelected ? new Set() : new Set(list.map((t) => t._id)))}
            />
            Select all ({list.length})
          </label>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {list.map((t) => (
              <li key={t._id}>
                <label className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-slate-50">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700" checked={picked.has(t._id)} onChange={() => toggle(t._id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      #{t.tripNo} · {fmtDate(t.date)}
                      {t.unitName ? ` · ${t.unitName}` : ""}
                    </span>
                    <span className="block truncate text-slate-500">
                      {t.location}
                      {t.vehicle ? ` · ${t.vehicle}` : ""}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{taka2(t.amount)}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        {picked.size > 0 && <span className="mr-auto text-sm text-slate-600">{picked.size} selected · {taka2(total)}</span>}
        <Button variant="secondary" onClick={onClose}>
          Cancel (বাতিল)
        </Button>
        <Button disabled={picked.size === 0} onClick={() => onAdd(list.filter((t) => picked.has(t._id)))}>
          Add to {type === "client" ? "invoice" : "bill"}
        </Button>
      </div>
    </Modal>
  );
}
