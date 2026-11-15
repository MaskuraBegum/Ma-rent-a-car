import { useRef } from "react";
import { fmtDate, taka, taka2 } from "../utils.js";
import { Button } from "./ui.jsx";

const cell = (type, v) => {
  if (v === null || v === undefined || v === "") return "-";
  if (type === "money") return taka(v);
  if (type === "money2") return taka2(v);
  if (type === "number") return Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (type === "date") return fmtDate(v);
  return String(v);
};
const isNum = (c) => ["money", "money2", "number"].includes(c.type);

function GroupTable({ group }) {
  const { columns, rows, totals } = group;
  const firstSum = columns.findIndex((c) => c.key in totals);
  const labelAt = Math.max(0, firstSum - 1);

  return (
    <div className="mb-6">
      {group.heading && <h3 className="font-semibold text-emerald-800">{group.heading}</h3>}
      {group.meta?.map((m) => (
        <p key={m} className="text-sm text-slate-500">
          {m}
        </p>
      ))}
      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-emerald-50 text-slate-700">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${isNum(c) ? "text-right" : "text-left"}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 align-top ${isNum(c) ? "text-right tabular-nums" : ""}`}>
                    {cell(c.type, r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
              {columns.map((c, i) => (
                <td key={c.key} className={`px-3 py-2 ${isNum(c) ? "text-right tabular-nums" : ""}`}>
                  {c.key in totals ? cell(c.type, totals[c.key]) : i === labelAt ? "Total" : ""}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Shows a generated report on screen ("Fast" output)
export default function ReportView({ report, onPdf, busy }) {
  const ref = useRef(null);

  const print = () => {
    ref.current.classList.add("printing");
    window.print();
    ref.current.classList.remove("printing");
  };

  return (
    <div ref={ref} className="mt-5 border-t border-slate-200 pt-4">
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <div className="mr-auto">
          <p className="text-xs text-slate-500">Maa Rent a Car Private Service</p>
          <h2 className="text-lg font-semibold">{report.title}</h2>
          <p className="text-sm text-slate-600">{[`Period: ${report.period}`, ...report.filters].join("  |  ")}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={print}>
            Print
          </Button>
          <Button onClick={onPdf} disabled={busy}>
            Download PDF
          </Button>
        </div>
      </div>

      {report.summary?.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {report.summary.map((s) => (
            <div key={s.label} className="rounded-lg bg-slate-100 px-3 py-2">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-lg font-semibold">{cell(s.type, s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {report.groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No records found for this period.
        </p>
      ) : (
        report.groups.map((g, i) => <GroupTable key={i} group={g} />)
      )}

      {report.notices?.map((n) => (
        <p key={n} className="mt-1 text-xs text-amber-700 print:hidden">
          {n}
        </p>
      ))}
    </div>
  );
}
