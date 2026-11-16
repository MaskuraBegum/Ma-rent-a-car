import { Field, inputCls } from "./ui.jsx";

// What the trip pays out. Own car: the driver's pay, typed for each trip (it is not fixed).
// Rented car: the vendor's amount. source = "own" | "rent" | undefined (not known yet).
export default function PayoutField({ source, value, onChange, hasDriver = true }) {
  const own = source === "own";
  const label = own ? "Driver pay (৳) (চালকের বেতন)" : source === "rent" ? "Vendor amount (৳)" : "Driver / vendor amount (৳)";

  return (
    <div>
      <Field label={label}>
        <input type="number" min="0" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      {own && <p className="mt-1 text-xs text-slate-500">Type the pay for this trip.</p>}
      {own && !hasDriver && <p className="mt-1 text-xs text-amber-700">Choose the driver from the list, so the pay goes to his account.</p>}
      {source === "rent" && <p className="mt-1 text-xs text-slate-500">This is added to what you owe the vendor.</p>}
    </div>
  );
}