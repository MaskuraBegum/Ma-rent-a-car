import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { useLookups } from "../hooks.js";
import { clientOptions, clientValue, dhakaToday, fmtPhone, splitClient, taka, toDateInput } from "../utils.js";

const NUMBERS = ["totalKm", "rent", "ownerAmount", "others"];
const MONEY = ["rent", "ownerAmount", "others"];

const empty = () => ({
  status: "requested",
  date: dhakaToday(),
  startTime: "",
  finishTime: "",
  location: "",
  clientUnit: "",
  passengerName: "",
  passengerPhone: "",
  car: "",
  vehicleType: "",
  driver: "",
  driverName: "",
  driverPhone: "",
  vendor: "",
  totalKm: "",
  fuelType: "",
  rent: "",
  ownerAmount: "",
  others: "",
  notes: "",
});

function buildPayload(v, isEdit) {
  const body = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "clientUnit") {
      Object.assign(body, splitClient(val));
      continue;
    }
    if (k === "status" && isEdit) continue;
    if (val === "" || val == null) {
      if (isEdit && MONEY.includes(k)) body[k] = 0; // a cleared amount means zero
      continue;
    }
    body[k] = NUMBERS.includes(k) ? Number(val) : typeof val === "string" ? val.trim() : val;
  }
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

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/trips/${id}`)
      .then((t) => {
        setTripStatus(t.status);
        setV({
          ...empty(),
          date: toDateInput(t.date),
          startTime: t.startTime || "",
          finishTime: t.finishTime || "",
          location: t.location || "",
          clientUnit: clientValue(t),
          passengerName: t.passengerName || "",
          passengerPhone: fmtPhone(t.passengerPhone),
          car: t.car?._id || "",
          vehicleType: t.vehicleType || "",
          driver: t.driver?._id || "",
          driverName: t.driverName || "",
          driverPhone: fmtPhone(t.driverPhone),
          vendor: t.vendor?._id || "",
          totalKm: t.totalKm ?? "",
          fuelType: t.fuelType || "",
          rent: t.rent ?? "",
          ownerAmount: t.ownerAmount ?? "",
          others: t.others ?? "",
          notes: t.notes || "",
        });
      })
      .catch((e) => toast(e.message, "err"))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  // A new booking request gets its driver later with "Assign driver"
  const showDriver = isEdit ? tripStatus !== "requested" : v.status === "completed";
  const office = Number(v.rent || 0) - Number(v.ownerAmount || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (office < 0) return toast("Owner amount cannot be more than the rent", "err");
    setSaving(true);
    try {
      const body = buildPayload(v, isEdit);
      if (!showDriver) {
        delete body.car;
        delete body.driver;
        delete body.driverName;
        delete body.driverPhone;
        delete body.vendor;
      }
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
      <h1 className="text-xl font-semibold">{isEdit ? "Edit trip" : "New trip"}</h1>

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

      <Section title="Trip">
        <Field label="Date *">
          <input type="date" required className={inputCls} value={v.date} onChange={set("date")} />
        </Field>
        <Field label="Location *">
          <input required className={inputCls} value={v.location} onChange={set("location")} placeholder="Mirpur, Uttara, Purbachal" />
        </Field>
        <Field label="Start time">
          <input type="time" className={inputCls} value={v.startTime} onChange={set("startTime")} />
        </Field>
        <Field label="Finish time" hint="Total hours are worked out for you">
          <input type="time" className={inputCls} value={v.finishTime} onChange={set("finishTime")} />
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

      {showDriver ? (
        <Section title="Car and driver">
          <Field label="Car (from your list)">
            <select className={inputCls} value={v.car} onChange={set("car")}>
              <option value="">None</option>
              {cars.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName} {c.model}
                  {c.registrationNo ? ` · ${c.registrationNo}` : ""}
                  {c.vendor ? ` (Vendor: ${c.vendor.name})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Car type (as written in your sheet)">
            <input className={inputCls} value={v.vehicleType} onChange={set("vehicleType")} placeholder="x noah, private car, Hiace" />
          </Field>
          <Field label={`Driver (from your list)${v.status === "completed" && !isEdit ? " *" : ""}`}>
            <select className={inputCls} value={v.driver} onChange={set("driver")}>
              <option value="">None</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendor (outside car)">
            <select className={inputCls} value={v.vendor} onChange={set("vendor")}>
              <option value="">None</option>
              {vendors.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          {!v.driver && (
            <>
              <Field label="Or type the driver's name">
                <input className={inputCls} value={v.driverName} onChange={set("driverName")} />
              </Field>
              <Field label="Driver mobile">
                <input type="tel" className={inputCls} value={v.driverPhone} onChange={set("driverPhone")} placeholder="+8801XXXXXXXXX" />
              </Field>
            </>
          )}
        </Section>
      ) : (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
          You will choose the driver and car after saving, with “Assign driver” on the trip.
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
        <Field label="Owner amount (৳)" hint="The share paid to the car owner, vendor or driver">
          <input type="number" min="0" className={inputCls} value={v.ownerAmount} onChange={set("ownerAmount")} />
        </Field>
        <Field label="Others (৳)">
          <input type="number" min="0" className={inputCls} value={v.others} onChange={set("others")} />
        </Field>
        <p className={`self-end pb-2 text-sm ${office < 0 ? "text-red-600" : "text-slate-600"}`}>
          {office < 0 ? "Owner amount cannot be more than the rent." : `Office share: ${taka(office)}`}
        </p>
        <Field label="Notes" className="sm:col-span-2">
          <input className={inputCls} value={v.notes} onChange={set("notes")} />
        </Field>
      </Section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => nav("/")}>
          Cancel
        </Button>
        {!isEdit && (
          <Button type="submit" variant="secondary" disabled={saving} onClick={() => (another.current = true)}>
            Save and add another
          </Button>
        )}
        <Button type="submit" disabled={saving} onClick={() => (another.current = false)}>
          {saving ? "Saving..." : "Save trip"}
        </Button>
      </div>
    </form>
  );
}
