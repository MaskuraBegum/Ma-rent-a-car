import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Button, btn, Empty, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import WhatsAppModal from "../components/WhatsAppModal.jsx";
import { useLookups } from "../hooks.js";
import { fmtDate, fmtPhone, minutesSince, taka, waitingLabel } from "../utils.js";
import AssignModal from "./AssignModal.jsx";

const TABS = [
  { key: "", label: "All" },
  { key: "requested", label: "New requests" },
  { key: "assigned", label: "Assigned" },
  { key: "sent", label: "Sent" },
  { key: "completed", label: "Completed" },
  { key: "declined,cancelled", label: "Closed" },
];
const STATUS_TONE = { requested: "amber", assigned: "amber", sent: "blue", completed: "green", declined: "red", cancelled: "slate" };
const STATUS_LABEL = {
  requested: "New request",
  assigned: "Assigned, not sent yet",
  sent: "Sent to customer",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};
const PAGE_SIZE = 30;

function Info({ label, value, warn }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`truncate ${warn ? "text-amber-700" : ""}`}>{value}</dd>
    </div>
  );
}

function TripCard({ t, onAssign, onWhatsApp, onStatus }) {
  const waiting = t.status === "requested" ? minutesSince(t.createdAt) : null;
  const clientLine = [t.client?.name, t.unitName].filter(Boolean).join(" · ");
  const open = ["requested", "assigned", "sent"].includes(t.status);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-500">#{t.tripNo}</span>
        <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
        {t.source === "website" && <Badge tone="blue">Website</Badge>}
        {t.isPossibleDuplicate && <Badge tone="red">Possible duplicate</Badge>}
        {waiting !== null && (
          <span className={`ml-auto text-xs ${waiting >= 10 ? "font-semibold text-red-600" : "text-slate-500"}`}>
            Waiting {waitingLabel(waiting)}
          </span>
        )}
      </div>

      <p className="mt-2 font-medium">{t.location}</p>
      <p className="text-sm text-slate-500">
        {fmtDate(t.date)}
        {t.dropDate && ` to ${fmtDate(t.dropDate)}`}
        {t.startTime && ` · ${t.startTime}${t.finishTime ? ` to ${t.finishTime}` : ""}`}
        {t.totalHours ? ` (${t.totalHours} h)` : ""}
        {t.chalanNo && ` · Chalan ${t.chalanNo}`}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Info label="Client" value={clientLine || "Not linked"} warn={!t.client} />
        <Info label="User" value={[t.passengerName, fmtPhone(t.passengerPhone)].filter(Boolean).join(" · ") || "-"} />
        <Info
          label={t.vehicleSource === "rent" ? "Rented car" : "Car"}
          value={`${[t.vehicleType, t.vendorCarNo].filter(Boolean).join(" · ") || "-"}${t.vendor ? ` (Vendor: ${t.vendor.name})` : ""}`}
        />
        <Info
          label="Driver"
          value={t.driverName ? `${t.driverName}${t.driverPhone ? ` · ${fmtPhone(t.driverPhone)}` : ""}` : "Not assigned"}
          warn={!t.driverName}
        />
        {(t.totalKm || t.fuelType) && <Info label="Distance and fuel" value={`${t.totalKm ?? "-"} km ${t.fuelType ?? ""}`} />}
        <Info label="Rent / Owner / Office" value={`${taka(t.rent)} / ${taka(t.ownerAmount)} / ${taka(t.officeAmount)}`} />
        {t.others > 0 && <Info label="Others" value={taka(t.others)} />}
      </dl>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {t.status === "requested" && <Button onClick={() => onAssign(t)}>Assign driver</Button>}
        {t.status === "assigned" && (
          <>
            <Button variant="whatsapp" onClick={() => onWhatsApp(t)}>
              Send on WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => onStatus(t, "sent")}>
              Mark as sent
            </Button>
          </>
        )}
        {t.status === "sent" && (
          <Button variant="secondary" onClick={() => onWhatsApp(t)}>
            WhatsApp message
          </Button>
        )}
        {["assigned", "sent"].includes(t.status) && (
          <>
            <Button variant="secondary" onClick={() => onStatus(t, "completed")}>
              Complete
            </Button>
            <Button variant="secondary" onClick={() => onAssign(t)}>
              Change driver
            </Button>
          </>
        )}
        {t.status === "requested" && (
          <Button variant="danger" onClick={() => onStatus(t, "declined", "Decline this request?")}>
            Decline
          </Button>
        )}
        {open && (
          <Button variant="danger" onClick={() => onStatus(t, "cancelled", "Cancel this trip?")}>
            Cancel
          </Button>
        )}
        <Link to={`/trips/${t._id}/edit`} className={btn("secondary")}>
          Edit
        </Link>
      </div>
    </div>
  );
}

export default function Trips() {
  const toast = useToast();
  const lookups = useLookups();
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [wa, setWa] = useState(null); // { trip, whatsapp }

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      if (tab) p.set("status", tab);
      if (q) p.set("search", q);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      if (tab === "requested") p.set("sort", "oldest"); // longest waiting first
      setData(await api.get(`/trips?${p}`));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [tab, q, from, to, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // the menu checks for new requests and tells this page to reload
  useEffect(() => {
    window.addEventListener("trips:changed", load);
    return () => window.removeEventListener("trips:changed", load);
  }, [load]);

  const setStatus = async (t, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return false;
    try {
      await api.post(`/trips/${t._id}/status`, { status });
      toast("Trip updated");
      load();
      return true;
    } catch (e) {
      toast(e.message, "err");
      return false;
    }
  };

  const openWhatsApp = async (t) => {
    try {
      const r = await api.get(`/trips/${t._id}/whatsapp`);
      setWa({ trip: t, whatsapp: r.whatsapp });
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const assigned = (res) => {
    setAssigning(null);
    setWa({ trip: res.trip, whatsapp: res.whatsapp });
    load();
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const changeTab = (key) => {
    setTab(key);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Trips</h1>
        <Link to="/trips/new" className={btn("primary")}>
          + New trip
        </Link>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
              tab === t.key ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input className={`${inputCls} sm:col-span-2`} placeholder="Search place, user or driver" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="date" className={inputCls} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} title="From date" />
        <input type="date" className={inputCls} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} title="To date" />
      </div>

      {loading && data.items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : data.items.length === 0 ? (
        <Empty>No trips here yet. Customer requests and trips you add will show up in this list.</Empty>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.items.map((t) => (
            <TripCard key={t._id} t={t} onAssign={setAssigning} onWhatsApp={openWhatsApp} onStatus={setStatus} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {pages} · {data.total} trips
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {assigning && <AssignModal trip={assigning} lookups={lookups} onClose={() => setAssigning(null)} onDone={assigned} />}

      {wa && (
        <WhatsAppModal
          whatsapp={wa.whatsapp}
          canConfirm={wa.trip.status === "assigned"}
          onClose={() => setWa(null)}
          onConfirmSent={async () => {
            if (await setStatus(wa.trip, "sent")) setWa(null);
          }}
        />
      )}
    </div>
  );
}
