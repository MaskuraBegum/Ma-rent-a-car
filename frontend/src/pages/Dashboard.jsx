
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge } from "../components/ui.jsx";
import { fmtDate, isOverdue, taka, taka2 } from "../utils.js";

const compact = (n) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

// ---------- small building blocks ----------

function Panel({ title, bn, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">
          {title} {bn && <span className="text-xs font-normal text-slate-500">({bn})</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const ACCENT = {
  green: { bar: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50" },
  red: { bar: "bg-red-500", text: "text-red-600", soft: "bg-red-50" },
  blue: { bar: "bg-sky-500", text: "text-sky-700", soft: "bg-sky-50" },
  amber: { bar: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-50" },
  slate: { bar: "bg-slate-400", text: "text-slate-700", soft: "bg-slate-50" },
};

function StatCard({ label, bn, value, note, tone = "green", children, className = "" }) {
  const a = ACCENT[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} />
      <p className="text-xs font-medium text-slate-500">
        {label} <span className="opacity-70">({bn})</span>
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${a.text}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  );
}

function MiniCard({ label, bn, value, note, tone = "slate", to, className = "" }) {
  const a = ACCENT[tone];
  const body = (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300">
      <span className={`mb-2 inline-block h-1.5 w-8 rounded-full ${a.bar}`} />
      <p className="text-xs text-slate-500">
        {label} <span className="opacity-70">({bn})</span>
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${a.text}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  );
  return to ? <Link to={to} className={className}>{body}</Link> : <div className={className}>{body}</div>;
}

// a thin bar split in parts, with a legend underneath
function SplitBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="mt-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          parts.map((p) => <span key={p.label} className={p.color} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${taka(p.value)}`} />)}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1">
            <i className={`inline-block h-2 w-2 rounded-full ${p.color}`} />
            {p.label} {taka(p.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- charts (plain SVG, no library) ----------

function TrendChart({ data }) {
  const W = 560, H = 230, L = 44, R = 8, T = 10, B = 28;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const step = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / step) * step;
  const iw = W - L - R, ih = H - T - B;
  const group = iw / data.length;
  const bw = Math.min(22, group / 3);
  const y = (v) => T + ih - (v / top) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Income and expense for the last 6 months">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeDasharray={t ? "3 3" : "0"} />
          <text x={L - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-400" fontSize="10">{compact(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = L + group * i + group / 2;
        return (
          <g key={d.month}>
            <rect x={cx - bw - 1} y={y(d.income)} width={bw} height={Math.max(0, y(0) - y(d.income))} rx="3" className="fill-emerald-500">
              <title>{`${monthLabel(d.month)} income: ${taka(d.income)}`}</title>
            </rect>
            <rect x={cx + 1} y={y(d.expense)} width={bw} height={Math.max(0, y(0) - y(d.expense))} rx="3" className="fill-amber-400">
              <title>{`${monthLabel(d.month)} expense: ${taka(d.expense)}`}</title>
            </rect>
            <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-500" fontSize="11">{monthLabel(d.month)}</text>
          </g>
        );
      })}
    </svg>
  );
}

const DONUT = { fuel: "#0ea5e9", maintenance: "#f59e0b", salary: "#10b981", office: "#8b5cf6", other: "#94a3b8" };

function Donut({ rows }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Expenses this month by category">
        <circle cx="70" cy="70" r={R} fill="none" strokeWidth="18" className="stroke-slate-100" />
        {rows.map((r) => {
          const len = (r.total / total) * C;
          const el = (
            <circle key={r.category} cx="70" cy="70" r={R} fill="none" strokeWidth="18" stroke={DONUT[r.category] || "#94a3b8"} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}>
              <title>{`${r.label}: ${taka(r.total)}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
          <text x="70" y="68" textAnchor="middle" fontSize="10" className="fill-slate-500">This month</text>
          <text x="70" y="84" textAnchor="middle" fontSize="14" fontWeight="600" className="fill-slate-800">{compact(total)}</text>
        </g>
      </svg>
      <ul className="w-full space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.category} className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT[r.category] || "#94a3b8" }} />
            <span className="text-slate-700">{r.label}</span>
            <span className="ml-auto tabular-nums text-slate-500">{taka(r.total)}</span>
            <span className="w-9 text-right text-xs tabular-nums text-slate-400">{Math.round((r.total / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- list widgets ----------

const STATUS_TONE = { sent: "blue", unpaid: "amber", partial: "amber", overdue: "red" };

function DueList({ rows, type, empty }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((inv) => {
        const late = isOverdue(inv);
        return (
          <li key={inv._id}>
            <Link to={`/invoices/${type}/${inv._id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{inv.billTo?.name || "-"}</p>
                <p className="text-xs text-slate-500">
                  {inv.invoiceNo} · due {fmtDate(inv.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{taka2(inv.balance)}</p>
                <Badge tone={late ? "red" : STATUS_TONE[inv.status] || "slate"}>{late ? "Overdue" : inv.status}</Badge>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Transactions({ rows }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">No payments yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((t, i) => {
        const inn = t.direction === "in";
        return (
          <li key={i} className="flex items-center gap-3 py-2">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${inn ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
              {inn ? "↓" : "↑"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
              <p className="text-xs text-slate-500">
                {t.ref}
                {t.method ? ` · ${t.method}` : ""} · {fmtDate(t.date)}
              </p>
            </div>
            <p className={`text-sm font-semibold tabular-nums ${inn ? "text-emerald-700" : "text-red-600"}`}>
              {inn ? "+" : "-"}
              {taka2(t.amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Expenses({ rows }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">No expenses yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((e) => (
        <li key={e._id} className="flex items-center gap-3 py-2">
          <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT[e.category] || "#94a3b8" }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{e.description || e.category}</p>
            <p className="text-xs capitalize text-slate-500">
              {e.category} · {fmtDate(e.date)}
              {e.car ? ` · ${e.car.registrationNo || `${e.car.companyName} ${e.car.model}`}` : ""}
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums">{taka(e.amount)}</p>
        </li>
      ))}
    </ul>
  );
}

const seeAll = (to, text = "See all") => (
  <Link to={to} className="text-xs text-emerald-700 hover:underline">
    {text} →
  </Link>
);

// ---------- page ----------

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    const load = () =>
      api
        .get("/dashboard")
        .then((r) => !stopped && (setD(r), setError("")))
        .catch((e) => !stopped && setError(e.message));
    load();
    const id = setInterval(load, 60000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  if (error && !d) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!d) return <p className="p-6 text-center text-sm text-slate-500">Loading dashboard…</p>;

  const c = d.cards;
  const netTone = c.net >= 0 ? "green" : "red";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">পরিবহন হিসাব · overview of money and trips</p>
      </div>

      {/* first 9 cards - 4 on row 1, 5 on row 2 (desktop) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 lg:grid-cols-20">
        <StatCard className="col-span-2 md:col-span-3 lg:col-span-5" label="Total Receivable" bn="মোট পাওনা" tone="green" value={taka(c.receivable.total)} note={`${c.receivable.count} open invoice${c.receivable.count === 1 ? "" : "s"}`} />

        <StatCard className="col-span-2 md:col-span-3 lg:col-span-5" label="Total Payable" bn="মোট দেনা" tone="red" value={taka(c.payable.total)} note={`${c.payable.count} open bill${c.payable.count === 1 ? "" : "s"}`}>
          <SplitBar
            parts={[
              { label: "Bills", value: c.payable.bills, color: "bg-red-500" },
              { label: "Drivers", value: c.payable.driverDues, color: "bg-amber-400" },
              { label: "Vendors", value: c.payable.vendorDues, color: "bg-slate-400" },
            ]}
          />
        </StatCard>

        <StatCard className="col-span-2 md:col-span-3 lg:col-span-5" label="Cash Balance" bn="নগদ ব্যালেন্স" tone="blue" value={taka(c.cash)} note="Received minus all payments and expenses" />

        <StatCard className="col-span-2 md:col-span-3 lg:col-span-5" label="Net Position" bn="নেট অবস্থা" tone={netTone} value={taka(c.net)} note="Cash + receivable − payable">
          <SplitBar
            parts={[
              { label: "Receivable", value: c.receivable.total, color: "bg-emerald-500" },
              { label: "Payable", value: c.payable.total, color: "bg-red-500" },
            ]}
          />
        </StatCard>

        <MiniCard
          className="col-span-1 md:col-span-2 lg:col-span-4"
          to="/"
          label="Active Trips"
          bn="চলমান ট্রিপ"
          tone="blue"
          value={c.activeTrips}
          note={
            <span className="flex flex-wrap gap-x-2">
              <span className="text-emerald-700">{c.completedTrips} completed</span>
              <span className="text-sky-700">{c.upcomingTrips} upcoming</span>
            </span>
          }
        />

        <MiniCard className="col-span-1 md:col-span-2 lg:col-span-4" to="/maintenance" label="Pending Maintenance" bn="মেইনটেন্যান্স" tone="amber" value={c.pendingMaintenance} note="Pending or in progress" />

        <MiniCard className="col-span-1 md:col-span-2 lg:col-span-4" label="This Month Income" bn="এই মাসের আয়" tone="green" value={taka(c.monthIncome)} note="Payments received" />

        <MiniCard className="col-span-1 md:col-span-3 lg:col-span-4" to="/expenses" label="This Month Expense" bn="এই মাসের খরচ" tone="red" value={taka(c.monthExpense)} note="All expenses" />

        <MiniCard className="col-span-2 md:col-span-3 lg:col-span-4" to="/invoices/client" label="Overdue Invoices" bn="বকেয়া ইনভয়েস" tone={c.overdueInvoices ? "red" : "slate"} value={c.overdueInvoices} note="Past the payment date" />
      </div>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Income vs Expense"
          bn="আয় ও খরচ"
          className="lg:col-span-2"
          action={
            <span className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Income</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" />Expense</span>
            </span>
          }
        >
          <TrendChart data={d.trend} />
        </Panel>
        <Panel title="Expenses by category" bn="খরচের খাত" action={seeAll("/expenses")}>
          {d.expenseByCategory.length ? <Donut rows={d.expenseByCategory} /> : <p className="py-10 text-center text-sm text-slate-500">No expenses this month.</p>}
        </Panel>
      </div>

      {/* lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Payable Bills" bn="দেনা বিল" action={seeAll("/invoices/vendor")}>
          <DueList rows={d.payableBills} type="vendor" empty="No unpaid supplier bills." />
        </Panel>
        <Panel title="Receivable Challans" bn="পাওনা চালান" action={seeAll("/invoices/client")}>
          <DueList rows={d.receivableInvoices} type="client" empty="No unpaid client invoices." />
        </Panel>
        <Panel title="Recent Transactions" bn="সাম্প্রতিক লেনদেন">
          <Transactions rows={d.transactions} />
        </Panel>
        <Panel title="Recent Expenses" bn="সাম্প্রতিক খরচ" action={seeAll("/expenses")}>
          <Expenses rows={d.expenses} />
        </Panel>
      </div>
    </div>
  );
}
