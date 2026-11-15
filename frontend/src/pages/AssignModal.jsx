import { useState } from "react";
import { api } from "../api.js";
import { Button, Field, inputCls, Modal } from "../components/ui.jsx";
import VehicleFields, { vehiclePayload, vehicleState } from "../components/VehicleFields.jsx";
import { useToast } from "../components/Toast.jsx";
import { clientOptions, clientValue, fmtDate, splitClient, taka } from "../utils.js";

export default function AssignModal({ trip, lookups, onClose, onDone }) {
  const toast = useToast();
  const { drivers, cars, vendors, clients } = lookups;
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    clientUnit: clientValue(trip),
    ...vehicleState(trip),
    rent: trip.rent || "",
    ownerAmount: trip.ownerAmount || "",
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const office = Number(f.rent || 0) - Number(f.ownerAmount || 0);

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...splitClient(f.clientUnit), ...vehiclePayload(f) };
    if (f.rent !== "") body.rent = Number(f.rent);
    if (f.ownerAmount !== "") body.ownerAmount = Number(f.ownerAmount);

    setSaving(true);
    try {
      onDone(await api.post(`/trips/${trip._id}/assign`, body));
    } catch (err) {
      toast(err.message, "err");
      setSaving(false);
    }
  };

  return (
    <Modal title={`Assign driver · Trip #${trip.tripNo}`} onClose={onClose} wide>
      <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        {fmtDate(trip.date)}
        {trip.startTime && ` at ${trip.startTime}`} · {trip.location}
        {trip.passengerName && <span className="block">{trip.passengerName}</span>}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Client / unit">
          <select className={inputCls} value={f.clientUnit} onChange={(e) => set("clientUnit", e.target.value)}>
            <option value="">Not linked</option>
            {clientOptions(clients).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <VehicleFields v={f} set={set} cars={cars} drivers={drivers} vendors={vendors} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent (৳)">
            <input type="number" min="0" className={inputCls} value={f.rent} onChange={(e) => set("rent", e.target.value)} />
          </Field>
          <Field label="Owner / vendor amount (৳)">
            <input type="number" min="0" className={inputCls} value={f.ownerAmount} onChange={(e) => set("ownerAmount", e.target.value)} />
          </Field>
        </div>
        <p className={`text-sm ${office < 0 ? "text-red-600" : "text-slate-600"}`}>
          {office < 0 ? "Owner amount cannot be more than the rent." : `Office share: ${taka(office)}`}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel (বাতিল)
          </Button>
          <Button type="submit" disabled={saving || office < 0}>
            {saving ? "Assigning..." : "Assign and get WhatsApp message"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
