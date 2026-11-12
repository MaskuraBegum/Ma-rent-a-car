import CrudPage from "../components/CrudPage.jsx";
import { Badge } from "../components/ui.jsx";
import { fmtPhone } from "../utils.js";

const fields = [
  {
    name: "type",
    label: "Client type",
    type: "choice",
    default: "individual",
    options: [
      { value: "individual", label: "Individual" },
      { value: "office", label: "Office" },
      { value: "corporate", label: "Corporate (many units)" },
    ],
  },
  { name: "name", label: "Name", required: true, full: true },
  {
    name: "phone",
    label: "WhatsApp number",
    type: "tel",
    placeholder: "+8801XXXXXXXXX",
    showIf: (v) => v.type !== "corporate",
    required: (v) => v.type !== "corporate",
  },
  { name: "contactName", label: "Contact person", showIf: (v) => v.type === "office" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Address (used on invoices)", full: true },
  { name: "units", label: "Units", type: "units", showIf: (v) => v.type === "corporate" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const TONE = { individual: "slate", office: "blue", corporate: "green" };

export default function Clients() {
  return (
    <CrudPage
      title="Clients"
      singular="client"
      endpoint="/clients"
      fields={fields}
      itemLabel={(c) => c.name}
      searchPlaceholder="Search name, phone or unit"
      renderBody={(c) => (
        <>
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{c.name}</p>
            <Badge tone={TONE[c.type]}>{c.type}</Badge>
          </div>
          {c.phone && (
            <p className="text-sm text-slate-600">
              {fmtPhone(c.phone)}
              {c.contactName ? ` · ${c.contactName}` : ""}
            </p>
          )}
          {c.address && <p className="text-sm text-slate-500">{c.address}</p>}
          {c.units?.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {c.units.map((u) => (
                <li key={u._id} className="rounded bg-slate-50 px-2 py-1">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-slate-500"> · {fmtPhone(u.phone)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    />
  );
}
