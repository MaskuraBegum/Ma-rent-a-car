import { useEffect, useMemo } from "react";
import { Button, Field, inputCls } from "./ui.jsx";

const emptyUnit = { name: "", contactName: "", phone: "", address: "" };

function ImageField({ field, value, current, onChange }) {
  const preview = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : current || null), [value, current]);
  return (
    <Field label={field.label} className="sm:col-span-2">
      <div className="flex items-center gap-3">
        {preview ? (
          <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-100 text-xs text-slate-400">No image</div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="text-sm"
        />
      </div>
    </Field>
  );
}

function UnitsField({ field, value, onChange }) {
  // start with one empty unit so the person sees what to fill in
  useEffect(() => {
    if (value.length === 0) onChange([{ ...emptyUnit }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (i, key, v) => onChange(value.map((u, idx) => (idx === i ? { ...u, [key]: v } : u)));

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-xs font-medium text-slate-600">{field.label}</p>
      <div className="space-y-3">
        {value.map((u, i) => (
          <div key={u._id || i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
            <Field label="Unit name *">
              <input className={inputCls} value={u.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="Head Office" />
            </Field>
            <Field label="Contact person">
              <input className={inputCls} value={u.contactName} onChange={(e) => set(i, "contactName", e.target.value)} />
            </Field>
            <Field label="WhatsApp number *">
              <input type="tel" className={inputCls} value={u.phone} onChange={(e) => set(i, "phone", e.target.value)} placeholder="+8801XXXXXXXXX" />
            </Field>
            <Field label="Address">
              <input className={inputCls} value={u.address} onChange={(e) => set(i, "address", e.target.value)} />
            </Field>
            <button
              type="button"
              className="text-left text-xs text-red-600 sm:col-span-2"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              Remove this unit
            </button>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="mt-2" onClick={() => onChange([...value, { ...emptyUnit }])}>
        + Add unit
      </Button>
    </div>
  );
}

export default function FormFields({ fields, values, setValue, item }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields
        .filter((f) => !f.showIf || f.showIf(values))
        .map((f) => {
          const v = values[f.name];
          const required = typeof f.required === "function" ? f.required(values) : !!f.required;
          const label = f.label + (required ? " *" : "");
          const span = f.full ? "sm:col-span-2" : "";

          if (f.type === "image") {
            return <ImageField key={f.name} field={f} value={v} current={item?.[f.name]} onChange={(x) => setValue(f.name, x)} />;
          }
          if (f.type === "units") {
            return <UnitsField key={f.name} field={f} value={v} onChange={(x) => setValue(f.name, x)} />;
          }
          if (f.type === "choice") {
            return (
              <div key={f.name} className="sm:col-span-2">
                <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {f.options.map((o) => (
                    <button
                      type="button"
                      key={o.value}
                      onClick={() => setValue(f.name, o.value)}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        v === o.value ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-slate-300 bg-white"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          if (f.type === "checkbox") {
            return (
              <label key={f.name} className={`flex items-center gap-2 text-sm ${span}`}>
                <input type="checkbox" checked={!!v} onChange={(e) => setValue(f.name, e.target.checked)} className="h-4 w-4 accent-emerald-700" />
                {f.label}
              </label>
            );
          }
          if (f.type === "multi") {
            return (
              <div key={f.name} className={span || "sm:col-span-2"}>
                <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>
                <div className="flex flex-wrap gap-4">
                  {f.options.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-700"
                        checked={v.includes(o.value)}
                        onChange={(e) => setValue(f.name, e.target.checked ? [...v, o.value] : v.filter((x) => x !== o.value))}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          }
          if (f.type === "select") {
            return (
              <Field key={f.name} label={label} hint={f.hint} className={span}>
                <select className={inputCls} value={v} required={required} onChange={(e) => setValue(f.name, e.target.value)}>
                  <option value="">{f.emptyLabel || "Choose..."}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            );
          }
          if (f.type === "textarea") {
            return (
              <Field key={f.name} label={label} hint={f.hint} className="sm:col-span-2">
                <textarea className={inputCls} rows={2} value={v} onChange={(e) => setValue(f.name, e.target.value)} />
              </Field>
            );
          }
          return (
            <Field key={f.name} label={label} hint={f.hint} className={span}>
              <input
                className={inputCls}
                type={f.type || "text"}
                value={v}
                required={required}
                min={f.min}
                placeholder={f.placeholder}
                onChange={(e) => setValue(f.name, e.target.value)}
              />
            </Field>
          );
        })}
    </div>
  );
}
