import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import ReportView from "../components/ReportView.jsx";
import { dhakaToday } from "../utils.js";

const MONTHS = [
  ["January", "জানুয়ারি"], ["February", "ফেব্রুয়ারি"], ["March", "মার্চ"], ["April", "এপ্রিল"],
  ["May", "মে"], ["June", "জুন"], ["July", "জুলাই"], ["August", "আগস্ট"],
  ["September", "সেপ্টেম্বর"], ["October", "অক্টোবর"], ["November", "নভেম্বর"], ["December", "ডিসেম্বর"],
];
const FREQUENCIES = [
  { value: "monthly", label: "Monthly (মাসিক)" },
  { value: "yearly", label: "Yearly (বাৎসরিক)" },
  { value: "range", label: "Date range (তারিখ অনুযায়ী)" },
];
const OUTPUTS = [
  { value: "fast", label: "Fast - show on screen (দ্রুত)" },
  { value: "pdf", label: "PDF - download" },
];

// filter: which extra dropdown the report has. pending: the module it still needs.
const SECTIONS = [
  { id: "trip", no: 1, title: "Trip Report", bn: "ট্রিপ রিপোর্ট", filter: "vehicle",
    types: [{ value: "trip_bill", label: "Trip-wise Supplier & Client Bill - F1", bn: "ট্রিপ অনুযায়ী সরবরাহকারী ও ক্লায়েন্ট বিল - ফ১" }] },
  { id: "customer", no: 2, title: "Customer Report", bn: "কাষ্টমার রিপোর্ট", filter: "customer",
    types: [{ value: "customer_invoice", label: "Customer Invoice - F1", bn: "কাষ্টমার ইনভয়েস - F1" }] },
  { id: "vehicle", no: 3, title: "Vehicle Report", bn: "যানবাহন রিপোর্ট", filter: "vehicle",
    types: [{ value: "vehicle_deposit_expense", label: "Trip-wise Deposit & Expense - F1", bn: "ট্রিপ অনুযায়ী জমা খরচ - ফ১" }] },
  { id: "expense", no: 4, title: "Expense Report", bn: "খরচ রিপোর্ট", filter: "vehicle",
    types: [{ value: "vehicle_expense", label: "Vehicle-wise Expense - F1", bn: "যানবাহন অনুযায়ী খরচ - ফ১" }] },
  { id: "purchase", no: 5, title: "Purchase Report", bn: "ক্রয় রিপোর্ট",
    pending: "Needs a Purchases module (shop bills and payments). Not built yet.",
    types: [{ value: "purchase_summary", label: "Purchase Summary - F1", bn: "ক্রয় সারসংক্ষেপ - ফ১" }] },
  { id: "inventory", no: 6, title: "Inventory Report", bn: "ইনভেন্টরি রিপোর্ট",
    pending: "Needs an Inventory module (parts and stock). Not built yet.",
    types: [{ value: "stock_status", label: "Stock Status - F1", bn: "স্টক অবস্থা - ফ১" }] },
  { id: "maintenance", no: 7, title: "Maintenance Report", bn: "মেইনটেন্যান্স রিপোর্ট", filter: "vehicle",
    types: [{ value: "vehicle_maintenance", label: "Vehicle-wise Maintenance - F1", bn: "যানবাহন অনুযায়ী মেইনটেন্যান্স - ফ১" }] },
  { id: "accounting", no: 8, title: "Accounting Report", bn: "হিসাবরক্ষণ রিপোর্ট",
    pending: "Needs the Ledger and payments. Not built yet.",
    types: [{ value: "trial_balance", label: "Trial Balance", bn: "রেওয়ামিল" }] },
  { id: "banking", no: 9, title: "Banking Report", bn: "ব্যাংকিং রিপোর্ট", filter: "bank",
    pending: "Needs Bank accounts and their transactions. Not built yet.",
    types: [{ value: "balance_statement", label: "Balance Statement", bn: "ব্যালেন্স বিবরণী" }] },
  { id: "income_expense", no: 10, title: "Income - Expense Report", bn: "আয় - ব্যয় রিপোর্ট",
    types: [{ value: "income_expense", label: "Income Expense (F1)", bn: "আয় ব্যয় (ফ১)" }] },
];

const today = () => {
  const [year, month] = dhakaToday().split("-").map(Number);
  return { year, month };
};
const defaults = (s) => ({
  type: s.types[0].value,
  target: "",
  frequency: "monthly",
  month: today().month,
  year: today().year,
  from: "",
  to: "",
  output: "fast",
});
const YEARS = Array.from({ length: 7 }, (_, i) => today().year - 5 + i);

const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
  </svg>
);
const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
  </svg>
);

function ReportSection({ s, vehicles, customers }) {
  const toast = useToast();
  const [open, setOpen] = useState(s.no === 1);
  const [f, setF] = useState(() => defaults(s));
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const query = (format) => {
    const p = new URLSearchParams({ frequency: f.frequency, format });
    if (f.frequency === "monthly") p.set("month", f.month);
    if (f.frequency !== "range") p.set("year", f.year);
    if (f.frequency === "range") {
      p.set("from", f.from);
      p.set("to", f.to);
    }
    if (f.target && s.filter === "vehicle") p.set("vehicle", f.target);
    if (f.target && s.filter === "customer") p.set("customer", f.target);
    return `/reports/${s.id}/${f.type}?${p}`;
  };

  const generate = async (format) => {
    setBusy(true);
    try {
      if (format === "pdf") {
        if (f.frequency === "range" && (!f.from || !f.to)) {
          toast("Choose the from and to dates", "err");
          return;
        }
        // opens the PDF in a new tab. The browser's viewer has Download and Print
        window.open(`/api${query("pdf")}`, "_blank", "noopener");
        return;
      } else {
        setReport(await api.get(query("json")));
      }
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setF(defaults(s));
    setReport(null);
  };

  const targetOptions = s.filter === "vehicle" ? vehicles : s.filter === "customer" ? customers : [];
  const targetLabel = s.filter === "customer" ? "Customer (কাষ্টমার)" : s.filter === "bank" ? "Bank account (ব্যাংক হিসাব)" : "Vehicle (যানবাহন)";
  const allLabel = s.filter === "customer" ? "-- All customers (সকল কাষ্টমার) --" : "-- All vehicles (সকল যানবাহন) --";

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">
          {s.no}. {s.title} <span className="font-normal text-slate-500">({s.bn})</span>
        </span>
        {s.pending && <Badge tone="amber">Not available yet</Badge>}
        <span className={`ml-auto text-slate-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Report type (রিপোর্টের ধরন)" className={s.filter ? "" : "lg:col-span-2"}>
              <select className={inputCls} value={f.type} onChange={set("type")}>
                {s.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.bn})
                  </option>
                ))}
              </select>
            </Field>

            {s.filter && (
              <Field label={targetLabel}>
                {s.filter === "bank" ? (
                  <select className={inputCls} disabled>
                    <option>Please select</option>
                  </select>
                ) : (
                  <select className={inputCls} value={f.target} onChange={set("target")}>
                    <option value="">{allLabel}</option>
                    {targetOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}

            <Field label="Frequency (সময়কাল)">
              <select className={inputCls} value={f.frequency} onChange={set("frequency")}>
                {FREQUENCIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            {f.frequency === "monthly" && (
              <Field label="Month (মাস)">
                <select className={inputCls} value={f.month} onChange={set("month")}>
                  {MONTHS.map(([en, bn], i) => (
                    <option key={en} value={i + 1}>
                      {en} ({bn})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {f.frequency !== "range" && (
              <Field label="Year (বছর)">
                <select className={inputCls} value={f.year} onChange={set("year")}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {f.frequency === "range" && (
              <>
                <Field label="From (শুরু)">
                  <input type="date" className={inputCls} value={f.from} onChange={set("from")} />
                </Field>
                <Field label="To (শেষ)">
                  <input type="date" className={inputCls} value={f.to} onChange={set("to")} />
                </Field>
              </>
            )}

            <Field label="Output">
              <select className={inputCls} value={f.output} onChange={set("output")}>
                {OUTPUTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {s.pending && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{s.pending}</p>}

          <div className="mt-4 flex gap-2">
            <Button onClick={() => generate(f.output)} disabled={busy || !!s.pending}>
              <DocIcon /> {busy ? "Working..." : "Generate (তৈরি করুন)"}
            </Button>
            <Button variant="secondary" onClick={reset}>
              <ResetIcon /> Reset (রিসেট)
            </Button>
          </div>

          {report && <ReportView report={report} busy={busy} onPdf={() => generate("pdf")} />}
        </div>
      )}
    </section>
  );
}

export default function Reports() {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    // all vehicles and clients (also inactive ones): old trips still belong to them
    api
      .get("/cars?limit=200")
      .then((r) =>
        setVehicles(
          r.items.map((c) => ({
            value: c._id,
            label: `${c.companyName} ${c.model}${c.registrationNo ? ` · ${c.registrationNo}` : ""}`,
          }))
        )
      )
      .catch(() => {});
    api
      .get("/clients?limit=200")
      .then((r) => setCustomers(r.items.map((c) => ({ value: c._id, label: c.name }))))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Reports (রিপোর্ট)</h1>
      <p className="mb-4 text-sm text-slate-500">
        Choose a report, the period and the output, then press Generate. “Fast” shows it here. “PDF” downloads a file.
      </p>
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <ReportSection key={s.id} s={s} vehicles={vehicles} customers={customers} />
        ))}
      </div>
    </div>
  );
}
