import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Empty, inputCls } from "../components/ui.jsx";
import LedgerEntryModal from "../components/LedgerEntryModal.jsx";
import { useToast } from "../components/Toast.jsx";
import { LEDGER } from "../lib/ledger.js";
import { fmtDate, fmtPhone, taka2 } from "../utils.js";

export default function LedgerBalances() {
  const { type } = useParams();
  if (!LEDGER[type]) return <Navigate to="/" replace />;
  return <Page key={type} type={type} />;
}

function Page({ type }) {
  const L = LEDGER[type];
  const toast = useToast();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [onlyOwed, setOnlyOwed] = useState(false);
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get(`/ledger/balances/${type}`));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [type, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items || []).filter((r) => (!q || r.party.name.toLowerCase().includes(q)) && (!onlyOwed || r.balance > 0));
  }, [data, search, onlyOwed]);

  if (!data) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">
        {L.dues} ({L.duesBn})
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        What we owe each {L.word.toLowerCase()}. A completed trip adds to it. A payment you record takes from it.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ["We owe now", data.totals.owed],
          ["Earned in total", data.totals.earned],
          ["Paid in total", data.totals.paid],
          ["Paid ahead", data.totals.advance],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-100 px-3 py-2">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-base font-semibold tabular-nums sm:text-lg">{taka2(value)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className={`${inputCls} sm:max-w-xs`} placeholder={`Search ${L.word.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={onlyOwed} onChange={(e) => setOnlyOwed(e.target.checked)} />
          Only those we owe
        </label>
      </div>

      {rows.length === 0 ? (
        <Empty>No {L.plural.toLowerCase()} to show.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">{L.word}</th>
                <th className="px-3 py-2 text-right font-medium">Earned</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">We owe</th>
                <th className="px-3 py-2 font-medium">Last payment</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.party._id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => nav(`/ledger/${type}/${r.party._id}`)}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-emerald-800">{r.party.name}</span>
                    {r.party.isActive === false && <span className="ml-2"><Badge>Inactive</Badge></span>}
                    <span className="block text-xs text-slate-500">{r.party.companyName || (r.party.phone ? fmtPhone(r.party.phone) : "")}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(r.earned)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(r.paid)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${r.balance > 0 ? "text-red-700" : r.balance < 0 ? "text-emerald-700" : ""}`}>
                    {r.balance < 0 ? `${taka2(-r.balance)} ahead` : taka2(r.balance)}
                  </td>
                  <td className="px-3 py-2">{r.lastPayment ? fmtDate(r.lastPayment) : "-"}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button onClick={() => setPaying(r)}>Pay</Button>
                      <Link to={`/ledger/${type}/${r.party._id}`} className={btn("secondary")}>
                        Account
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <LedgerEntryModal
          type={type}
          party={paying.party}
          balance={paying.balance}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            load();
          }}
        />
      )}
    </div>
  );
}