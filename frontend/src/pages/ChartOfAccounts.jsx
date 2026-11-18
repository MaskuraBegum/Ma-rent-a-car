import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { toDateInput } from "../utils.js";

const stamp = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "No transactions yet";

// Bank, Cash and Credit Cards come from the Accounts records (so balances stay true);
// every other section is a plain list of ledger heads.
const GROUPS = [
  {
    key: "assets", label: "Assets", bn: "সম্পদ",
    sections: [
      { title: "Bank", bn: "ব্যাংক", kind: "account", types: ["bank", "mobile"], newType: "bank" },
      { title: "Cash", bn: "নগদ", kind: "account", types: ["cash"], newType: "cash" },
      { title: "Money in Transit", bn: "পথে থাকা অর্থ", kind: "head", sub: "Money in Transit" },
      { title: "Property, Plant & Equipment", bn: "স্থায়ী সম্পদ", kind: "head", sub: "Property, Plant & Equipment" },
      { title: "Other Short-Term Assets", bn: "অন্যান্য স্বল্পমেয়াদি সম্পদ", kind: "head", sub: "Other Short-Term Assets" },
    ],
  },
  {
    key: "liabilities", label: "Liabilities & Credit Cards", bn: "দায় ও ক্রেডিট কার্ড",
    sections: [
      { title: "Credit Cards", bn: "ক্রেডিট কার্ড", kind: "account", types: ["card"], newType: "card" },
      { title: "Liabilities", bn: "দায়", kind: "head", group: "liabilities" },
    ],
  },
  { key: "income", label: "Income", bn: "আয়", sections: [{ title: "Income", bn: "আয়", kind: "head", group: "income" }] },
  { key: "expenses", label: "Expenses", bn: "ব্যয়", sections: [{ title: "Expenses", bn: "ব্যয়", kind: "head", group: "expenses" }] },
  { key: "equity", label: "Equity", bn: "মালিকানা স্বত্ব", sections: [{ title: "Equity", bn: "মালিকানা স্বত্ব", kind: "head", group: "equity" }] },
];

export default function ChartOfAccounts() {
  const toast = useToast();
  const [data, setData] = useState({ accounts: [], heads: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { s, g, row? }
  const [form, setForm] = useState({ name: "", accountNo: "", openingBalance: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get("/chart"));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const rowsFor = (s, g) =>
    s.kind === "account"
      ? data.accounts.filter((a) => s.types.includes(a.type))
      : data.heads.filter((h) => (s.sub ? h.group === "assets" && h.subGroup === s.sub : h.group === (s.group || g.key)));

  const openNew = (s, g) => {
    setModal({ s, g });
    setForm({ name: "", accountNo: "", openingBalance: "", note: "" });
  };
  const openEdit = (s, g, row) => {
    setModal({ s, g, row });
    setForm({ name: row.name, accountNo: row.accountNo || "", openingBalance: row.openingBalance ?? "", note: row.note || "" });
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const { s, g, row } = modal;
    setSaving(true);
    try {
      if (s.kind === "account") {
        const body = { name: form.name.trim() };
        if (form.accountNo.trim()) body.accountNo = form.accountNo.trim();
        if (form.openingBalance !== "") body.openingBalance = Number(form.openingBalance);
        if (row) await api.patch(`/transactions/accounts/${row._id}`, body);
        else await api.post("/transactions/accounts", { ...body, type: s.newType });
      } else {
        const body = { name: form.name.trim() };
        if (form.note.trim()) body.note = form.note.trim();
        if (row) await api.patch(`/chart/heads/${row._id}`, body);
        else await api.post("/chart/heads", { ...body, group: s.sub ? "assets" : s.group || g.key, ...(s.sub ? { subGroup: s.sub } : {}) });
      }
      toast("Saved");
      setModal(null);
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s, row) => {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try {
      await api.del(s.kind === "account" ? `/transactions/accounts/${row._id}` : `/chart/heads/${row._id}`);
      toast("Deleted");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">
        Chart of Accounts <span className="text-sm font-normal text-slate-500">(হিসাবের তালিকা)</span>
      </h1>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((g) => (
            <section key={g.key}>
              <h2 className="mb-3 border-b border-slate-200 pb-1 text-lg font-semibold text-emerald-800">
                {g.label} <span className="text-sm font-normal text-slate-500">({g.bn})</span>
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {g.sections.map((s) => {
                  const rows = rowsFor(s, g);
                  return (
                    <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="mr-auto font-medium">
                          {s.title} <span className="text-xs font-normal text-slate-500">({s.bn})</span>
                        </h3>
                        <Button variant="secondary" onClick={() => openNew(s, g)}>
                          + Add New <span className="text-xs opacity-70">(নতুন যোগ করুন)</span>
                        </Button>
                      </div>
                      {rows.length === 0 ? (
                        <p className="py-3 text-center text-sm text-slate-400">Nothing here yet.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {rows.map((r) => (
                            <li key={r._id} className={`flex items-center gap-2 py-2 ${r.isActive ? "" : "opacity-60"}`}>
                              <div className="mr-auto min-w-0">
                                <p className="truncate text-sm font-medium">{r.name}</p>
                                <p className="text-xs text-slate-500">
                                  {s.kind === "account" ? `Last transaction: ${stamp(r.lastTransactionAt)}` : r.note || `Added ${toDateInput(r.createdAt)}`}
                                </p>
                              </div>
                              {r.isActive ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}
                              <Button variant="secondary" onClick={() => openEdit(s, g, r)}>Edit</Button>
                              <Button variant="danger" onClick={() => remove(s, r)}>Delete</Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={`${modal.row ? "Edit" : "Add"} · ${modal.s.title}`} onClose={() => setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Name *"><input required className={inputCls} value={form.name} onChange={set("name")} /></Field>
            {modal.s.kind === "account" ? (
              <>
                <Field label="Account no."><input className={inputCls} value={form.accountNo} onChange={set("accountNo")} /></Field>
                <Field label="Opening balance (৳)"><input type="number" step="0.01" className={inputCls} value={form.openingBalance} onChange={set("openingBalance")} /></Field>
              </>
            ) : (
              <Field label="Note"><input className={inputCls} value={form.note} onChange={set("note")} /></Field>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}