import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { fmtPhone } from "../utils.js";
import { Badge, Button, Empty, inputCls, Modal } from "./ui.jsx";
import FormFields from "./FormFields.jsx";
import { useToast } from "./Toast.jsx";

const blank = (f) =>
  f.type === "checkbox" ? false : f.type === "multi" || f.type === "units" ? [] : f.type === "image" ? null : "";

function initialValues(fields, item) {
  const out = {};
  for (const f of fields) {
    let v = item ? (f.get ? f.get(item) : item[f.name]) : f.default;
    if (v === undefined || v === null) v = blank(f);
    if (f.type === "tel" && v) v = fmtPhone(v);
    if (f.type === "image") v = null; // a new file is picked this time; the current one shows from the record
    if (f.type === "units") {
      v = v.map((u) => ({
        _id: u._id,
        name: u.name || "",
        contactName: u.contactName || "",
        phone: fmtPhone(u.phone) || "",
        address: u.address || "",
      }));
    }
    out[f.name] = v;
  }
  return out;
}

function toPayload(fields, values, multipart) {
  const visible = fields.filter((f) => !f.showIf || f.showIf(values));

  if (multipart) {
    const fd = new FormData();
    for (const f of visible) {
      const v = values[f.name];
      if (f.type === "image") {
        if (v instanceof File) fd.append(f.name, v);
        else if (v === "remove") fd.append(`remove_${f.name}`, "true");
      } else if (v !== "" && v != null) {
        fd.append(f.name, String(v).trim());
      }
    }
    return fd;
  }

  const body = {};
  for (const f of visible) {
    let v = values[f.name];
    if (f.type === "number") {
      v = v === "" ? undefined : Number(v);
    } else if (f.type === "units") {
      v = v
        .filter((u) => u.name.trim() || u.phone.trim())
        .map((u) => ({
          ...(u._id ? { _id: u._id } : {}),
          name: u.name.trim(),
          phone: u.phone.trim(),
          ...(u.contactName.trim() ? { contactName: u.contactName.trim() } : {}),
          ...(u.address.trim() ? { address: u.address.trim() } : {}),
        }));
    } else if (typeof v === "string") {
      v = v.trim();
      if (v === "") v = f.nullable ? null : undefined;
    }
    if (v !== undefined) body[f.name] = v;
  }
  return body;
}

function Avatar({ src, name }) {
  return src ? (
    <img src={src} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function CrudPage({
  title,
  singular,
  endpoint,
  fields,
  multipart = false,
  imageKey,
  itemLabel,
  renderBody,
  searchPlaceholder = "Search...",
}) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState("true");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, record = edit
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (q) params.set("search", q);
      if (active !== "all") params.set("active", active);
      const r = await api.get(`${endpoint}?${params}`);
      setItems(r.items);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [endpoint, q, active, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (item) => {
    setEditing(item || {});
    setValues(initialValues(fields, item));
  };
  const close = () => setEditing(null);
  const setValue = (name, v) => setValues((s) => ({ ...s, [name]: v }));

  const save = async (e) => {
    e.preventDefault();
    const missing = fields.find(
      (f) => f.type === "multi" && f.required && (!f.showIf || f.showIf(values)) && values[f.name].length === 0
    );
    if (missing) return toast(`Choose at least one: ${missing.label}`, "err");

    setSaving(true);
    try {
      const body = toPayload(fields, values, multipart);
      if (editing._id) await api.patch(`${endpoint}/${editing._id}`, body);
      else await api.post(endpoint, body);
      toast(`${singular[0].toUpperCase()}${singular.slice(1)} saved`);
      close();
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (item) => {
    if (!window.confirm(`Deactivate ${itemLabel(item)}? Old trips and records stay. You can activate again later.`)) return;
    try {
      await api.del(`${endpoint}/${item._id}`);
      toast("Deactivated");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const activate = async (item) => {
    try {
      await api.patch(`${endpoint}/${item._id}`, { isActive: true });
      toast("Activated");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{title}</h1>
        <input
          className={`${inputCls} sm:w-56`}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputCls} w-auto`} value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="all">All</option>
        </select>
        <Button onClick={() => openForm(null)}>+ Add {singular}</Button>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <Empty>No {title.toLowerCase()} found. Use “Add {singular}” to create the first one.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item._id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${item.isActive ? "" : "opacity-60"}`}>
              <div className="flex gap-3">
                {imageKey && <Avatar src={item[imageKey]} name={itemLabel(item)} />}
                <div className="min-w-0 flex-1">{renderBody(item)}</div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Button variant="secondary" onClick={() => openForm(item)}>
                  Edit
                </Button>
                {item.isActive ? (
                  <Button variant="danger" onClick={() => deactivate(item)}>
                    Deactivate
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => activate(item)}>Activate</Button>
                    <Badge>Inactive</Badge>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing._id ? `Edit ${singular}` : `Add ${singular}`} onClose={close} wide>
          <form onSubmit={save}>
            <FormFields fields={fields} values={values} setValue={setValue} item={editing} />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}