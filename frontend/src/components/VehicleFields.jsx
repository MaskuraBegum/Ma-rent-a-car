import { Field, inputCls } from "./ui.jsx";

// Vehicle information used by the trip form and the "Assign driver" window.
//   Own: a company car and a driver from the lists.
//   Rent: the vendor's car (vendor, car number, driver typed).

export const vehicleState = (t = {}) => ({
  vehicleSource: t.vehicleSource || "own",
  car: t.car?._id || "",
  driver: t.driver?._id || "",
  vendor: t.vendor?._id || "",
  vendorCarNo: t.vendorCarNo || "",
  vehicleType: t.vehicleType || "",
  driverName: t.driverName || "",
  driverPhone: t.driverPhone ? `+${t.driverPhone}` : "",
});

// what to send to the server for the vehicle part
export function vehiclePayload(v) {
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== "" && x != null));
  if (v.vehicleSource === "rent") {
    return clean({
      vehicleSource: "rent",
      vendor: v.vendor,
      vendorCarNo: v.vendorCarNo,
      vehicleType: v.vehicleType,
      car: v.car, // only when picked from the vendor's registered cars
      driverName: v.driverName,
      driverPhone: v.driverPhone,
    });
  }
  return clean({
    vehicleSource: "own",
    car: v.car,
    driver: v.driver,
    ...(v.driver ? {} : { driverName: v.driverName, driverPhone: v.driverPhone }),
  });
}

export default function VehicleFields({ v, set, cars, drivers, vendors }) {
  const own = v.vehicleSource !== "rent";
  const companyCars = cars.filter((c) => !c.vendor);
  const vendorCars = cars.filter((c) => c.vendor && c.vendor._id === v.vendor);

  const switchSource = (source) => {
    set("vehicleSource", source);
    set("car", ""); // a car from one side does not belong to the other
  };

  const pickVendorCar = (id) => {
    set("car", id);
    const c = cars.find((x) => x._id === id);
    if (c) {
      set("vendorCarNo", c.registrationNo || "");
      set("vehicleType", `${c.companyName} ${c.model}`);
    }
  };

  return (
    <>
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs font-medium text-slate-600">Source (উৎস) *</p>
        <div className="flex gap-2">
          {[
            ["own", "Own (নিজস্ব)"],
            ["rent", "Rent (ভাড়া)"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => switchSource(value)}
              className={`rounded-lg border px-4 py-2 text-sm ${
                v.vehicleSource === value ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-slate-300 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {own ? (
        <>
          <Field label="Vehicle (যানবাহন) *">
            <select className={inputCls} required value={v.car} onChange={(e) => set("car", e.target.value)}>
              <option value="">Please select</option>
              {companyCars.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName} {c.model}
                  {c.registrationNo ? ` · ${c.registrationNo}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Driver (চালক) *">
            <select className={inputCls} value={v.driver} onChange={(e) => set("driver", e.target.value)} required={!v.driverName}>
              <option value="">Please select</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          {!v.driver && (
            <>
              <Field label="Or type the driver's name">
                <input className={inputCls} value={v.driverName} onChange={(e) => set("driverName", e.target.value)} />
              </Field>
              <Field label="Driver mobile">
                <input type="tel" className={inputCls} value={v.driverPhone} onChange={(e) => set("driverPhone", e.target.value)} placeholder="+8801XXXXXXXXX" />
              </Field>
            </>
          )}
        </>
      ) : (
        <>
          <Field label="Vendor (ভেন্ডর) *">
            <select
              className={inputCls}
              required
              value={v.vendor}
              onChange={(e) => {
                set("vendor", e.target.value);
                set("car", "");
              }}
            >
              <option value="">Please select</option>
              {vendors.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.companyName ? `${x.name} (${x.companyName})` : x.name}
                </option>
              ))}
            </select>
          </Field>
          {vendorCars.length > 0 ? (
            <Field label="This vendor's saved cars" hint="Pick one to fill the car number and type">
              <select className={inputCls} value={v.car} onChange={(e) => pickVendorCar(e.target.value)}>
                <option value="">Not in the list</option>
                {vendorCars.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName} {c.model}
                    {c.registrationNo ? ` · ${c.registrationNo}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Field label="Vendor car number *" hint="The plate number of the rented car">
            <input
              className={inputCls}
              required
              value={v.vendorCarNo}
              onChange={(e) => set("vendorCarNo", e.target.value)}
              placeholder="Dhaka Metro-GA 12-3456"
            />
          </Field>
          <Field label="Car type">
            <input className={inputCls} value={v.vehicleType} onChange={(e) => set("vehicleType", e.target.value)} placeholder="Noah, Hiace, private car" />
          </Field>
          <Field label="Driver name *">
            <input className={inputCls} required value={v.driverName} onChange={(e) => set("driverName", e.target.value)} />
          </Field>
          <Field label="Driver mobile">
            <input type="tel" className={inputCls} value={v.driverPhone} onChange={(e) => set("driverPhone", e.target.value)} placeholder="+8801XXXXXXXXX" />
          </Field>
        </>
      )}
    </>
  );
}
