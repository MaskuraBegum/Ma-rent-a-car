import CrudPage from "../components/CrudPage.jsx";
import { fmtPhone } from "../utils.js";

const fields = [
  { name: "photo", label: "Photo", type: "image" },
  { name: "name", label: "Full name", required: true },
  { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "+8801XXXXXXXXX" },
  { name: "email", label: "Email", type: "email" },
  { name: "nidNo", label: "NID card number", required: true, hint: "10, 13 or 17 digits" },
  { name: "licenseNo", label: "Driving licence number", required: true },
];

export default function Drivers() {
  return (
    <CrudPage
      title="Drivers"
      singular="driver"
      endpoint="/drivers"
      fields={fields}
      multipart
      imageKey="photo"
      itemLabel={(d) => d.name}
      searchPlaceholder="Search name or phone"
      renderBody={(d) => (
        <>
          <p className="font-semibold">{d.name}</p>
          <p className="text-sm text-slate-600">{fmtPhone(d.phone)}</p>
          {d.email && <p className="truncate text-sm text-slate-500">{d.email}</p>}
          <p className="mt-1 text-xs text-slate-500">NID: {d.nidNo}</p>
          <p className="text-xs text-slate-500">Licence: {d.licenseNo}</p>
        </>
      )}
    />
  );
}
