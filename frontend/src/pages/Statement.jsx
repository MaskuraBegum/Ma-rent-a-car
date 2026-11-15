import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Button, Field, inputCls } from "../components/ui.jsx";
import ReportView from "../components/ReportView.jsx";
import { useToast } from "../components/Toast.jsx";
import { PARTY } from "../lib/invoice.js";
import { dhakaToday } from "../utils.js";

export default function Statement() {
  const { type } = useParams();
  if (!PARTY[type]) return <Navigate to="/" replace />;
  return <Page key={type} type={type} />;
}

function Page({ type }) {
  const L = PARTY[type];
  const toast = useToast();
  const today = dhakaToday();
  const [parties, setParties] = useState([]);
  const [f, setF] = useState({ party: "", from: `${today.slice(0, 4)}-01-01`, to: today });
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    api.get(`/${type === "client" ? "clients" : "vendors"}?limit=200`).then((r) => setParties(r.items)).catch(() => {});
  }, [type]);

  const query = (format) => {
    const p = new URLSearchParams({ type, from: f.from, to: f.to, format });
    if (f.party) p.set("party", f.party);
    return `/invoices/statement?${p}`;
  };

  const generate = async () => {
    if (!f.from || !f.to) return toast("Choose the from and to dates", "err");
    setBusy(true);
    try {
      setReport(await api.get(query("json")));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const openPdf = () => {
    if (!f.from || !f.to) return toast("Choose the from and to dates", "err");
    window.open(`/api${query("pdf")}`, "_blank", "noopener");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-xl font-semibold">{L.party} statement ({L.partyBn} বিবরণী)</h1>
      <p className="mb-4 text-sm text-slate-500">
        All {L.plural.toLowerCase()} and payments of a {L.party.toLowerCase()} with the running balance.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={`${L.party} (${L.partyBn})`}>
            <select className={inputCls} value={f.party} onChange={set("party")}>
              <option value="">-- All {L.party.toLowerCase()}s --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From (শুরু)">
            <input type="date" className={inputCls} value={f.from} onChange={set("from")} />
          </Field>
          <Field label="To (শেষ)">
            <input type="date" className={inputCls} value={f.to} onChange={set("to")} />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={generate} disabled={busy}>
            {busy ? "Working..." : "Generate (তৈরি করুন)"}
          </Button>
          <Button variant="secondary" onClick={openPdf}>
            View PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setF({ party: "", from: `${today.slice(0, 4)}-01-01`, to: today });
              setReport(null);
            }}
          >
            Reset (রিসেট)
          </Button>
        </div>

        {report && <ReportView report={report} busy={busy} onPdf={openPdf} />}
      </div>
    </div>
  );
}
