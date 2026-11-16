import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls } from "../components/ui.jsx";
import LedgerEntryModal from "../components/LedgerEntryModal.jsx";
import { useToast } from "../components/Toast.jsx";
import { KIND_LABEL, LEDGER } from "../lib/ledger.js";
import { fmtDate, fmtPhone, taka2 } from "../utils.js";

export default function LedgerParty() {
  const { type, id } = useParams();
  if (!LEDGER[type]) return <Navigate to="/" replace />;
  return <Page key={`${type}-${id}`} type={type} id={id} />;
}

const KIND_TONE = { duty: "blue", payment: "green", opening: "slate", adjustment: "amber" };

function Page({ type, id }) {
  const L = LEDGER[type];
  const toast = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [entry, setEntry] = useState(null); // the kind being added: "payment" | "opening" | "adjustment"

  const query = useCallback(
    (extra = {}) => {
      const p = new URLSearchParams(extra);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const s = p.toString();
      return `/ledger/${type}/${id}${s ? `?${s}` : ""}`;
    },
    [type, id, from, to]
  );

  const load = useCallback(async () => {
    try {
      setData(await api.get(query()));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [query, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row) => {
    if (!window.confirm("Delete this line? The balance changes.")) return;
    try {
      await api.del(`/ledger/entries/${row._id}`);
      toast("Deleted");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  if (!data) return <p className="text-sm text-slate-500">Loading...</p>;

  const { party } = data;
  const owed = data.closing >= 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/ledger/${type}`} className="text-sm text-emerald-700 hover:underline">
          ← {L.dues}
        </Link>
        <h1 className="ml-2 text-xl font-semibold">{party.name}</h1>
        <span className="text-sm text-slate-500">{party.companyName || (party.phone ? fmtPhone(party.phone) : "")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ["Opening balance", taka2(data.opening)],
          ["Earned", taka2(data.earned)],
          ["Paid", taka2(data.paid)],
          [owed ? "We owe now" : "Paid ahead", taka2(Math.abs(data.closing))],
        ].map(([label, value], i) => (
          <div key={label} className={`rounded-lg px-3 py-2 ${i === 3 ? (owed ? "bg-red-50" : "bg-emerald-50") : "bg-slate-100"}`}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Button onClick={() => setEntry("payment")}>Pay (পরিশোধ)</Button>
        <Button variant="secondary" onClick={() => setEntry("opening")}>
          Opening balance
        </Button>
        <Button variant="secondary" onClick={() => setEntry("adjustment")}>
          Adjustment
        </Button>
        <Button variant="secondary" onClick={() => window.open(`/api${query({ format: "pdf" })}`, "_blank", "noopener")}>
          View PDF
        </Button>
        <div className="ml-auto flex gap-2">
          <Field label="From">
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </div>

      {data.rows.length === 0 && !data.opening ? (
        <Empty>
          Nothing in this account yet. Completed trips add to it by themselves. Use “Opening balance” for what was owed before this system, and “Pay” when you pay.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Particulars</th>
                <th className="px-3 py-2 text-right font-medium">Earned</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {from && (
                <tr className="border-t border-slate-100 bg-slate-50 text-slate-600">
                  <td className="px-3 py-2">{fmtDate(`${from}T00:00:00+06:00`)}</td>
                  <td className="px-3 py-2">Balance brought forward</td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(data.opening)}</td>
                  <td />
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r._id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={KIND_TONE[r.kind]}>{KIND_LABEL[r.kind]}</Badge>
                    <span className="ml-2">{r.particulars}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.earned ? taka2(r.earned) : "-"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.paid ? taka2(r.paid) : "-"}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{taka2(r.balance)}</td>
                  <td className="px-3 py-2 text-right">
                    {r.deletable ? (
                      <button className="text-xs text-red-600 hover:underline" onClick={() => remove(r)}>
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400" title="Change the trip to change this line">
                        from trip
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entry && (
        <LedgerEntryModal
          type={type}
          party={party}
          balance={data.closing}
          kind={entry}
          onClose={() => setEntry(null)}
          onSaved={() => {
            setEntry(null);
            load();
          }}
        />
      )}
    </div>
  );
}