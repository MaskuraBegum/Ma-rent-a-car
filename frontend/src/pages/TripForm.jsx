import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import LocationInput from "../components/LocationInput.jsx";
import VehicleFields, { vehiclePayload, vehicleState } from "../components/VehicleFields.jsx";
import { useToast } from "../components/Toast.jsx";
import { useLookups } from "../hooks.js";
import { clientOptions, clientValue, dhakaToday, fmtPhone, splitClient, taka, toDateInput } from "../utils.js";
import PayoutField from "../components/PayoutField.jsx";


const NUMBERS = ["totalKm", "rent", "ownerAmount", "others"];
const MONEY = ["rent", "ownerAmount", "others"];
const CLEARABLE = ["chalanNo", "dropDate", "dropLocation", "notes"]; // when editing, an empty box clears the value
const VEHICLE_KEYS = ["vehicleSource", "car", "driver", "vendor", "vendorCarNo", "vehicleType", "driverName", "driverPhone"];

const empty = () => ({
  status: "requested",
  chalanNo: "",
  date: dhakaToday(),
  dropDate: "",
  pickupLocation: "",
  dropLocation: "",
  startTime: "",
  finishTime: "",
  notes: "",
  clientUnit: "",
  passengerName: "",
  passengerPhone: "",
  ...vehicleState(),
  totalKm: "",
  fuelType: "",
  rent: "",
  ownerAmount: "",
  others: "",
});

function buildPayload(v, { isEdit, withVehicle }) {
  const body = {};
  for (const [k, val] of Object.entries(v)) {
    if (VEHICLE_KEYS.includes(k)) continue; // handled below
    if (k === "clientUnit") {
      Object.assign(body, splitClient(val));
      continue;
    }
    if (k === "status" && isEdit) continue;
    if (val === "" || val == null) {
      if (isEdit && MONEY.includes(k)) body[k] = 0; // a cleared amount means zero
      else if (isEdit && CLEARABLE.includes(k)) body[k] = "";
      continue;
    }
    body[k] = NUMBERS.includes(k) ? Number(val) : typeof val === "string" ? val.trim() : val;
  }
  if (withVehicle) Object.assign(body, vehiclePayload(v));
  return body;
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default function TripForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const { drivers, cars, vendors, clients } = useLookups();
  const [v, setV] = useState(empty());
  const [tripStatus, setTripStatus] = useState(null); // status of the trip being edited
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const another = useRef(false);

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const setVal = (k, value) => setV((s) => ({ ...s, [k]: value }));

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/trips/${id}`)
      .then((t) => {
        setTripStatus(t.status);
        setV({
          ...empty(),
          ...vehicleState(t),
          chalanNo: t.chalanNo || "",
          date: toDateInput(t.date),
          dropDate: t.dropDate ? toDateInput(t.dropDate) : "",
          pickupLocation: t.pickupLocation || t.location || "", // older trips only have one location
          dropLocation: t.dropLocation || "",
          startTime: t.startTime || "",
          finishTime: t.finishTime || "",
          notes: t.notes || "",
          clientUnit: clientValue(t),
          passengerName: t.passengerName || "",
          passengerPhone: fmtPhone(t.passengerPhone),
          totalKm: t.totalKm ?? "",
          fuelType: t.fuelType || "",
          rent: t.rent ?? "",
          ownerAmount: t.ownerAmount ?? "",
          others: t.others ?? "",
        });
      })
      .catch((e) => toast(e.message, "err"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  // A new booking request gets its vehicle and driver later with "Assign driver"
  const showVehicle = isEdit ? tripStatus !== "requested" : v.status === "completed";
  const office = Number(v.rent || 0) - Number(v.ownerAmount || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (office < 0) return toast("Owner amount cannot be more than the rent", "err");
    if (v.dropDate && v.dropDate < v.date) return toast("Drop date cannot be before the pickup date", "err");
    setSaving(true);
    try {
      const body = buildPayload(v, { isEdit, withVehicle: showVehicle });
      const t = isEdit ? await api.patch(`/trips/${id}`, body) : await api.post("/trips", body);
      toast(`Trip #${t.tripNo} saved`);
      if (another.current) {
        setV({ ...empty(), date: v.date, status: v.status });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        nav("/");
      }
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{isEdit ? "Edit trip" : "New trip"}</h1>
        <Button variant="secondary" onClick={() => nav(-1)}>
          ← Go back (ফিরে যান)
        </Button>
      </div>

      {!isEdit && (
        <div className="flex flex-wrap gap-2">
          {[
            ["requested", "New booking request"],
            ["completed", "Completed trip (daily entry)"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setV((s) => ({ ...s, status: value }))}
              className={`rounded-lg border px-3 py-2 text-sm ${
                v.status === value ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-slate-300 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <Section title="Trip info (ট্রিপ তথ্য)">
        <Field label="Chalan / invoice no. (optional)">
          <input className={inputCls} value={v.chalanNo} onChange={set("chalanNo")} placeholder="e.g. 1001" />
        </Field>
        <Field label="Pickup date (শুরুর তারিখ) *">
          <input type="date" required className={inputCls} value={v.date} onChange={set("date")} />
        </Field>
        <Field label="Pickup point (শুরুর স্থান) *" hint="Start typing a place. You can also type any address">
          <LocationInput required value={v.pickupLocation} onChange={(x) => setVal("pickupLocation", x)} placeholder="e.g. Uttara, Dhaka" />
        </Field>
        <Field label="Drop point (গন্তব্য) - optional">
          <LocationInput value={v.dropLocation} onChange={(x) => setVal("dropLocation", x)} placeholder="e.g. Purbachal, Dhaka" />
        </Field>
        <Field label="Drop date (গন্তব্যের তারিখ) - optional" hint="Only when the trip ends on another day">
          <input type="date" min={v.date} className={inputCls} value={v.dropDate} onChange={set("dropDate")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input type="time" className={inputCls} value={v.startTime} onChange={set("startTime")} />
          </Field>
          <Field label="Finish time">
            <input type="time" className={inputCls} value={v.finishTime} onChange={set("finishTime")} />
          </Field>
        </div>
        <Field label="Note (নোট) - optional" className="sm:col-span-2">
          <input className={inputCls} value={v.notes} onChange={set("notes")} placeholder="Optional note" />
        </Field>
      </Section>

      <Section title="Client and user">
        <Field label={`Client / unit${v.status === "completed" && !isEdit ? " *" : ""}`} className="sm:col-span-2">
          <select className={inputCls} value={v.clientUnit} onChange={set("clientUnit")} required={!isEdit && v.status === "completed"}>
            <option value="">Not linked</option>
            {clientOptions(clients).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="User name">
          <input className={inputCls} value={v.passengerName} onChange={set("passengerName")} />
        </Field>
        <Field label="User mobile" hint="The WhatsApp message goes to this number">
          <input type="tel" className={inputCls} value={v.passengerPhone} onChange={set("passengerPhone")} placeholder="+8801XXXXXXXXX" />
        </Field>
      </Section>

      {showVehicle ? (
        <Section title="Vehicle information (যানবাহনের তথ্য)">
          <VehicleFields v={v} set={setVal} cars={cars} drivers={drivers} vendors={vendors} />
        </Section>
      ) : (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
          You will choose the vehicle and driver after saving, with “Assign driver” on the trip.
        </p>
      )}

      <Section title="Distance and money">
        <Field label="Total km">
          <input type="number" min="0" className={inputCls} value={v.totalKm} onChange={set("totalKm")} />
        </Field>
        <Field label="Fuel">
          <select className={inputCls} value={v.fuelType} onChange={set("fuelType")}>
            <option value="">-</option>
            <option value="octane">Octane</option>
            <option value="cng">CNG</option>
            <option value="lpg">LPG</option>
          </select>
        </Field>
        <Field label="Rent (৳)">
          <input type="number" min="0" className={inputCls} value={v.rent} onChange={set("rent")} />
        </Field>
        <PayoutField
          source={showVehicle ? v.vehicleSource : undefined}
          rent={v.rent}
          value={v.ownerAmount}
          onChange={(x) => setVal("ownerAmount", x)}
          hasDriver={!!v.driver}
        />
        <Field label="Others (৳)">
          <input type="number" min="0" className={inputCls} value={v.others} onChange={set("others")} />
        </Field>
        <p className={`self-end pb-2 text-sm ${office < 0 ? "text-red-600" : "text-slate-600"}`}>
          {office < 0 ? "Owner amount cannot be more than the rent." : `Office share: ${taka(office)}`}
        </p>
      </Section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => nav("/")}>
          Cancel (বাতিল)
        </Button>
        {!isEdit && (
          <Button type="submit" variant="secondary" disabled={saving} onClick={() => (another.current = true)}>
            <PlusIcon /> Save &amp; add more (সেভ করে আরও যোগ করুন)
          </Button>
        )}
        <Button type="submit" disabled={saving} onClick={() => (another.current = false)}>
          <SaveIcon /> {saving ? "Saving..." : "Save (সেভ)"}
        </Button>
      </div>
    </form>
  );
}
