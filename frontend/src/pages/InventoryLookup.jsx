import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

// Categories and Units: a quick-add form on the left, the table on the right.
const KINDS = {
  categories: {
    title: "Inventory categories", bn: "ক্যাটাগরি", addTitle: "Add category", word: "category",
    fields: [{ key: "name", label: "Name", bn: "নাম", placeholder: "e.g. Filter" }],
  },
  units: {
    title: "Inventory units", bn: "একক", addTitle: "Add unit", word: "unit",
    fields: [
      { key: "name", label: "Name", bn: "নাম", placeholder: "e.g. Meter" },
      { key: "shortName", label: "Short form", bn: "সংক্ষিপ্ত রূপ", placeholder: "e.g. m", narrow: true },
    ],
  },
};

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </svg>
);

export default function InventoryLookup({ kind }) {
  return <Page key={kind} kind={kind} />;
}

function Page({ kind }) {
  const K = KINDS[kind];
  const toast = useToast();
  const empty = Object.fromEntries(K.fields.map((f) => [f.key, ""]));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({}); // id -> changed values not saved yet

  const load = useCallback(async () => {
    try {
      setRows((await api.get(`/inventory/${kind}`)).items);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [kind, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/inventory/${kind}`, form);
      toast(`${K.word[0].toUpperCase()}${K.word.slice(1)} added`);
      setForm(empty);
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const valueOf = (r, key) => edits[r._id]?.[key] ?? r[key];
  const dirty = (r) => K.fields.some((f) => edits[r._id]?.[f.key] !== undefined && edits[r._id][f.key].trim() !== r[f.key]);
  const setEdit = (r, key, v) => setEdits((s) => ({ ...s, [r._id]: { ...s[r._id], [key]: v } }));

  const patch = async (r, body, done) => {
    try {
      await api.patch(`/inventory/${kind}/${r._id}`, body);
      toast(done);
      setEdits((s) => {
        const { [r._id]: _gone, ...rest } = s;
        return rest;
      });
      load();
    } catch (err) {
      toast(err.message, "err");
    }
  };
  const saveRow = (r) => patch(r, Object.fromEntries(K.fields.map((f) => [f.key, valueOf(r, f.key).trim()])), "Saved");
  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.name}"?`)) return;
    try {
      await api.del(`/inventory/${kind}/${r._id}`);
      toast("Deleted");
      load();
    } catch (err) {
      toast(err.message, "err");
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">
        {K.title} ({K.bn})
      </h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={add} className="space-y-3 self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">{K.addTitle}</h2>
          {K.fields.map((f) => (
            <Field key={f.key} label={`${f.label} (${f.bn}) *`}>
              <input required className={inputCls} placeholder={f.placeholder} value={form[f.key]} maxLength={f.narrow ? 12 : 80} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
            </Field>
          ))}
          <Button type="submit" disabled={saving}>
            + {saving ? "Adding..." : "Add (যোগ করুন)"}
          </Button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-3 font-semibold">{K.title}</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : rows.length === 0 ? (
            <Empty>No {kind} yet</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="w-8 py-2">#</th>
                    {K.fields.map((f) => (
                      <th key={f.key} className="px-2">{f.label}</th>
                    ))}
                    <th className="px-2">Status</th>
                    <th className="px-2 text-right">Items</th>
                    <th className="px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r._id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-500">{i + 1}</td>
                      {K.fields.map((f, n) => (
                        <td key={f.key} className="p-1">
                          <div className="flex items-center gap-1">
                            <input
                              className={`${inputCls} ${f.narrow ? "w-24" : ""}`}
                              value={valueOf(r, f.key)}
                              maxLength={f.narrow ? 12 : 80}
                              onChange={(e) => setEdit(r, f.key, e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && dirty(r) && saveRow(r)}
                            />
                            {n === K.fields.length - 1 && dirty(r) && (
                              <button type="button" onClick={() => saveRow(r)} className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700" title="Save" aria-label="Save">
                                <SaveIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="px-2"><Badge tone={r.isActive ? "green" : "slate"}>{r.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="px-2 text-right tabular-nums">{r.itemCount}</td>
                      <td className="px-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => patch(r, { isActive: !r.isActive }, r.isActive ? "Deactivated" : "Activated")}>
                            {r.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="danger" className="px-2 py-1" onClick={() => remove(r)} aria-label="Delete">
                            <TrashIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}