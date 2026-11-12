import { useState } from "react";
import { api } from "../api.js";
import { Button, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { clientOptions, clientValue, fmtDate, splitClient, taka } from "../utils.js";

export default function AssignModal({ trip, lookups, onClose, onDone }) {
  const toast = useToast();
  const { drivers, cars, vendors, clients } = lookups;
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    clientUnit: clientValue(trip),
    driver: trip.driver?._id || "",
    car: trip.car?._id || "",
    vendor: trip.vendor?._id || "",
    rent: trip.rent || "",
    ownerAmount: trip.ownerAmount || "",
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const car = cars.find((c) => c._id === f.car);
  const office = Number(f.rent || 0) - Number(f.ownerAmount || 0);

  const submit = async (e) => {
    e.preventDefault();
    const body = { driver: f.driver, ...splitClient(f.clientUnit) };
    if (f.car) body.car = f.car;
    if (f.vendor) body.vendor = f.vendor;
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
    <Modal title={`Assign driver · Trip #${trip.tripNo}`} onClose={onClose}>
      <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        {fmtDate(trip.date)}
        {trip.startTime && ` at ${trip.startTime}`} · {trip.location}
        {trip.passengerName && <span className="block">{trip.passengerName}</span>}
      </p>

      <form onSubmit={submit} className="space-y-3">
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

        <Field label="Driver *">
          <select className={inputCls} required value={f.driver} onChange={(e) => set("driver", e.target.value)}>
            <option value="">Choose a driver...</option>
            {drivers.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Car"
          hint={car?.vendor ? `This is ${car.vendor.name}'s car. The owner amount is paid to the vendor.` : undefined}
        >
          <select className={inputCls} value={f.car} onChange={(e) => set("car", e.target.value)}>
            <option value="">No car chosen</option>
            {cars.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName} {c.model}
                {c.registrationNo ? ` · ${c.registrationNo}` : ""}
                {c.vendor ? ` (Vendor: ${c.vendor.name})` : ""}
              </option>
            ))}
          </select>
        </Field>

        {!car?.vendor && (
          <Field label="Vendor (only for an outside car that is not in the cars list)">
            <select className={inputCls} value={f.vendor} onChange={(e) => set("vendor", e.target.value)}>
              <option value="">None</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent (৳)">
            <input type="number" min="0" className={inputCls} value={f.rent} onChange={(e) => set("rent", e.target.value)} />
          </Field>
          <Field label="Owner amount (৳)">
            <input type="number" min="0" className={inputCls} value={f.ownerAmount} onChange={(e) => set("ownerAmount", e.target.value)} />
          </Field>
        </div>
        <p className={`text-sm ${office < 0 ? "text-red-600" : "text-slate-600"}`}>
          {office < 0 ? "Owner amount cannot be more than the rent." : `Office share: ${taka(office)}`}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || office < 0}>
            {saving ? "Assigning..." : "Assign and get WhatsApp message"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
