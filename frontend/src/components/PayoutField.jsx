import { Field, inputCls } from "./ui.jsx";
import { DRIVER_PAY_MAX_PERCENT } from "../lib/ledger.js";
import { taka } from "../utils.js";

// What the trip pays out. Own car: the driver's pay, typed for each trip (it is not fixed).
// Rented car: the vendor's amount. source = "own" | "rent" | undefined (not known yet).
export default function PayoutField({ source, rent, value, onChange, hasDriver = true }) {
  const own = source === "own";
  const label = own ? "Driver pay (৳) (চালকের বেতন)" : source === "rent" ? "Vendor amount (৳)" : "Driver / vendor amount (৳)";
  const limit = Math.floor(((Number(rent) || 0) * DRIVER_PAY_MAX_PERCENT) / 100);
  const over = own && limit > 0 && (Number(value) || 0) > limit;

  return (
    <div>
      <Field label={label}>
        <input type="number" min="0" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      {own && limit > 0 && (
        <p className={`mt-1 text-xs ${over ? "font-medium text-amber-700" : "text-slate-500"}`}>
          {over
            ? `Above the usual limit: ${DRIVER_PAY_MAX_PERCENT}% of the rent is ${taka(limit)}.`
            : `Type the pay for this trip. Usual limit: ${taka(limit)} (${DRIVER_PAY_MAX_PERCENT}% of the rent).`}
        </p>
      )}
      {own && !hasDriver && <p className="mt-1 text-xs text-amber-700">Choose the driver from the list, so the pay goes to his account.</p>}
      {source === "rent" && <p className="mt-1 text-xs text-slate-500">This is added to what you owe the vendor.</p>}
    </div>
  );
}