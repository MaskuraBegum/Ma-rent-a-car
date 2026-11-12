import CrudPage from "../components/CrudPage.jsx";
import { fmtPhone } from "../utils.js";

const fields = [
  { name: "image", label: "Photo or logo (optional)", type: "image" },
  { name: "name", label: "Name", required: true },
  { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "+8801XXXXXXXXX" },
  { name: "companyName", label: "Company name (if any)", full: true },
];

export default function Vendors() {
  return (
    <CrudPage
      title="Vendors"
      singular="vendor"
      endpoint="/vendors"
      fields={fields}
      multipart
      imageKey="image"
      itemLabel={(v) => v.name}
      searchPlaceholder="Search name, company or phone"
      renderBody={(v) => (
        <>
          <p className="font-semibold">{v.name}</p>
          {v.companyName && <p className="text-sm text-slate-600">{v.companyName}</p>}
          <p className="text-sm text-slate-500">{fmtPhone(v.phone)}</p>
        </>
      )}
    />
  );
}
