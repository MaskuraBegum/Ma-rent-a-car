import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import CrudPage from "../components/CrudPage.jsx";
import { Badge } from "../components/ui.jsx";

const FUELS = [
  { value: "octane", label: "Octane" },
  { value: "cng", label: "CNG" },
  { value: "lpg", label: "LPG" },
];

export default function Cars() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    api.get("/vendors?active=true&limit=200").then((r) => setVendors(r.items)).catch(() => {});
  }, []);

  const fields = useMemo(
    () => [
      { name: "companyName", label: "Car company", required: true, placeholder: "Toyota" },
      { name: "model", label: "Model", required: true, placeholder: "Noah" },
      { name: "year", label: "Production year", type: "number", required: true, min: 1980, placeholder: "2018" },
      { name: "seatCapacity", label: "Seat capacity", type: "number", required: true, min: 1 },
      { name: "ac", label: "Has AC", type: "checkbox" },
      { name: "soundSystem", label: "Has sound system", type: "checkbox" },
      { name: "fuelTypes", label: "Fuel type", type: "multi", required: true, options: FUELS },
      { name: "registrationNo", label: "Plate number", placeholder: "Dhaka Metro-GA 12-3456" },
      {
        name: "vendor",
        label: "Owner",
        type: "select",
        nullable: true,
        emptyLabel: "Company car",
        get: (c) => c.vendor?._id,
        options: vendors.map((v) => ({ value: v._id, label: v.companyName ? `${v.name} (${v.companyName})` : v.name })),
        hint: "Pick a vendor if this car belongs to an outside owner",
      },
    ],
    [vendors]
  );

  return (
    <CrudPage
      title="Cars"
      singular="car"
      endpoint="/cars"
      fields={fields}
      itemLabel={(c) => `${c.companyName} ${c.model}`}
      searchPlaceholder="Search company, model or plate"
      renderBody={(c) => (
        <>
          <p className="font-semibold">
            {c.companyName} {c.model} <span className="font-normal text-slate-500">({c.year})</span>
          </p>
          <p className="text-sm text-slate-500">{c.registrationNo || "No plate number"}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge tone="blue">{c.seatCapacity} seats</Badge>
            {c.ac && <Badge tone="green">AC</Badge>}
            {c.soundSystem && <Badge tone="green">Sound</Badge>}
            {c.fuelTypes.map((f) => (
              <Badge key={f} tone="amber">
                {f.toUpperCase()}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Owner: {c.vendor ? c.vendor.name : "Company car"}</p>
        </>
      )}
    />
  );
}
