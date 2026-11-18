import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Empty, Field, inputCls, Modal } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { dhakaToday, fmtDate, taka2 } from "../utils.js";
import { cap, monthNow, PageTitle, STATUS_TONE } from "../lib/hr.jsx";

const Row = ({ label, value, strong, minus }) => (
  <div className={`flex justify-between py-1 ${strong ? "border-t border-slate-200 pt-2 font-semibold" : ""}`}>
    <span className="text-slate-600">{label}</span>
    <span className="tabular-nums">{minus ? "- " : ""}{typeof value === "number" ? taka2(value) : value}</span>
  </div>
);

export default function HrPayroll() {
  const toast = useToast();
  const [month, setMonth] = useState(monthNow());
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [pay, setPay] = useState(null); // sheet being paid
  const [accounts, setAccounts] = useState([]);
  const [payForm, setPayForm] = useState({ account: "", paidDate: dhakaToday() });

  const load = useCallback(async () => {
    try {
      setRows((await api.get(`/hr/payroll?month=${month}`)).items);
    } catch (e) {
      toast(e.message, "err");
    }
  }, [month, toast]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api.get("/transactions/accounts?active=true").then((r) => setAccounts(r.items)).catch(() => {});
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api.post("/hr/payroll/generate", { month });
      toast(`${r.created} salary sheet(s) ready`);
      if (r.skipped.length) toast(`No salary structure for: ${r.skipped.join(", ")}`, "err");
      load();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };
  const approve = async (r) => {
    try {
      await api.post(`/hr/payroll/${r._id}/status`, { status: "approved" });
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const doPay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/hr/payroll/${pay._id}/status`, { status: "paid", paidDate: payForm.paidDate, ...(payForm.account ? { account: payForm.account } : {}) });
      toast("Marked as paid");
      setPay(null);
      load();
    } catch (err) {
      toast(err.message, "err");
    }
  };
  const remove = async (r) => {
    if (!window.confirm(`Delete the draft for ${r.name}?`)) return;
    try {
      await api.del(`/hr/payroll/${r._id}`);
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const unmarked = rows.reduce((s, r) => s + (r.counts?.unmarked || 0), 0);

  return (
    <div>
      <PageTitle en="Payroll" bn="বেতন প্রদান" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="month" className={`${inputCls} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)} />
        <Button onClick={generate} disabled={busy}>{busy ? "Working..." : rows.length ? "Recalculate drafts" : "Generate salary sheet"}</Button>
        <span className="text-xs text-slate-500">Approved and paid sheets are never changed.</span>
      </div>
      {unmarked > 0 && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {unmarked} working day(s) have no attendance mark and are counted as absent. Mark them in Attendance, then recalculate.
        </p>
      )}

      {rows.length === 0 ? (
        <Empty>No salary sheet for this month. Use “Generate salary sheet”. Each employee needs a salary structure for their designation.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Employee</th><th className="px-3 py-2 text-right">Working days</th><th className="px-3 py-2 text-right">Paid days</th>
                <th className="px-3 py-2 text-right">Trips</th><th className="px-3 py-2 text-right">Earnings</th><th className="px-3 py-2 text-right">Deductions</th>
                <th className="px-3 py-2 text-right">Net pay</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-3 py-2"><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.designation}</p></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.workingDays}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.paidDays}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.trips}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{taka2(r.gross)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600">{taka2(r.advance + r.fines)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{taka2(r.net)}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.status]}>{cap(r.status)}</Badge></td>
                  <td className="px-3 py-2"><div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setView(r)}>View</Button>
                    {r.status === "draft" && <Button onClick={() => approve(r)}>Approve</Button>}
                    {r.status !== "paid" && <Button onClick={() => { setPay(r); setPayForm({ account: "", paidDate: dhakaToday() }); }}>Pay</Button>}
                    {r.status === "draft" && <Button variant="danger" onClick={() => remove(r)}>Delete</Button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
              <tr>
                <td className="px-3 py-2" colSpan={4}>Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{taka2(sum("gross"))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{taka2(sum("advance") + sum("fines"))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{taka2(sum("net"))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {view && (
        <Modal title={`${view.name} · ${view.designation} · ${view.month}`} onClose={() => setView(null)}>
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Attendance</p>
              <p className="text-slate-600">
                Present {view.counts.P} · Absent {view.counts.A} · Half day {view.counts.HD} · Leave {view.counts.Lpaid + view.counts.Lunpaid} · Holiday {view.counts.H} · Weekly off {view.counts.W}
                {view.counts.unmarked > 0 && <span className="text-amber-700"> · Not marked {view.counts.unmarked}</span>}
              </p>
              <p className="mt-1 text-slate-600">{view.daysInMonth} days in month, {view.workingDays} working days. Paid days {view.paidDays} at {taka2(view.perDay)} per day.</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Earnings</p>
              <Row label={`Base salary (${taka2(view.base)}) for attendance`} value={view.earnedBase} />
              <Row label={`Trip incentive (${view.trips} trips)`} value={view.incentive} />
              <Row label="Food allowance" value={view.food} />
              <Row label="Travel allowance" value={view.travel} />
              <Row label="Other allowance" value={view.other} />
              <Row label="Total earnings" value={view.gross} strong />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Deductions</p>
              <Row label="Advance installment" value={view.advance} minus />
              <Row label="Fines" value={view.fines} minus />
            </div>
            <Row label="Net payable" value={view.net} strong />
            {view.paidDate && <p className="text-xs text-slate-500">Paid on {fmtDate(view.paidDate)}</p>}
          </div>
        </Modal>
      )}

      {pay && (
        <Modal title={`Pay ${pay.name} · ${taka2(pay.net)}`} onClose={() => setPay(null)}>
          <form onSubmit={doPay} className="space-y-3">
            <Field label="Paid on"><input type="date" required className={inputCls} value={payForm.paidDate} onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })} /></Field>
            <Field label="Pay from account" hint="Optional. If chosen, a Cash Out (Salary) entry is added in Transactions">
              <select className={inputCls} value={payForm.account} onChange={(e) => setPayForm({ ...payForm, account: e.target.value })}>
                <option value="">Do not record in Transactions</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </Field>
            <p className="text-xs text-slate-500">Paying also deducts the advance installment and marks this month's fines as deducted. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPay(null)}>Cancel</Button>
              <Button type="submit">Confirm payment</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}