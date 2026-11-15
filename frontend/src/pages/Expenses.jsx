import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import CrudPage from "../components/CrudPage.jsx";
import { Badge } from "../components/ui.jsx";
import { dhakaToday, fmtDate, taka, toDateInput } from "../utils.js";

export const CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "office", label: "Office" },
  { value: "other", label: "Other" },
];
const label = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;

export default function Expenses() {
  const [cars, setCars] = useState([]);

  useEffect(() => {
    api.get("/cars?active=true&limit=200").then((r) => setCars(r.items)).catch(() => {});
  }, []);

  const fields = useMemo(
    () => [
      { name: "date", label: "Date", type: "date", required: true, default: dhakaToday(), get: (e) => toDateInput(e.date) },
      { name: "category", label: "Category", type: "select", required: true, options: CATEGORIES },
      { name: "amount", label: "Amount (৳)", type: "number", required: true, min: 1 },
      {
        name: "car",
        label: "Vehicle",
        type: "select",
        nullable: true,
        emptyLabel: "General (no vehicle)",
        get: (e) => e.car?._id,
        options: cars.map((c) => ({
          value: c._id,
          label: `${c.companyName} ${c.model}${c.registrationNo ? ` · ${c.registrationNo}` : ""}`,
        })),
        hint: "Pick the vehicle for fuel and repairs, so the vehicle reports are right",
      },
      { name: "description", label: "Description", full: true, placeholder: "Octane 20 litres, brake pads, office rent..." },
    ],
    [cars]
  );

  return (
    <CrudPage
      title="Expenses"
      singular="expense"
      endpoint="/expenses"
      fields={fields}
      itemLabel={(e) => e.description || label(e.category)}
      searchPlaceholder="Search description"
      renderBody={(e) => (
        <>
          <p className="text-lg font-semibold">{taka(e.amount)}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone="amber">{label(e.category)}</Badge>
            <span className="text-sm text-slate-500">{fmtDate(e.date)}</span>
          </div>
          {e.description && <p className="mt-1 text-sm text-slate-700">{e.description}</p>}
          <p className="mt-1 text-xs text-slate-500">
            {e.car ? `${e.car.companyName} ${e.car.model}${e.car.registrationNo ? ` · ${e.car.registrationNo}` : ""}` : "General expense"}
          </p>
        </>
      )}
    />
  );
}
