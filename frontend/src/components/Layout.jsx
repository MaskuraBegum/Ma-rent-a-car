import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api.js";

const links = [
  { to: "/", label: "Trips", end: true, badge: true },
  { to: "/trips/new", label: "New trip" },
  { to: "/drivers", label: "Drivers" },
  { to: "/vendors", label: "Vendors" },
  { to: "/cars", label: "Cars" },
  { to: "/clients", label: "Clients" },
];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* sound is optional */
  }
}

// Checks for new booking requests every 20 seconds: badge, sound, browser alert
function useNewRequests() {
  const [count, setCount] = useState(0);
  const prev = useRef(null);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const r = await api.get("/trips?status=requested&limit=1");
        if (stopped) return;
        setCount(r.total);
        if (prev.current !== null && r.total !== prev.current) {
          window.dispatchEvent(new Event("trips:changed"));
          if (r.total > prev.current) {
            beep();
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("New booking request", { body: `${r.total} request(s) waiting` });
            }
          }
        }
        prev.current = r.total;
      } catch {
        /* the server may be restarting: try again next time */
      }
    };
    check();
    const id = setInterval(check, 20000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    document.title = count ? `(${count}) Maa Rent a Car` : "Maa Rent a Car";
  }, [count]);

  return count;
}

export default function Layout() {
  const count = useNewRequests();
  const [perm, setPerm] = useState("Notification" in window ? Notification.permission : "denied");

  const linkCls = ({ isActive }) =>
    `flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-100"
    }`;

  const items = links.map((l) => (
    <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
      {l.label}
      {l.badge && count > 0 && <span className="rounded-full bg-red-600 px-2 text-xs text-white">{count}</span>}
    </NavLink>
  ));

  const enableAlerts = async () => setPerm(await Notification.requestPermission());

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4 md:flex">
        <p className="mb-4 text-lg font-semibold leading-tight text-emerald-800">Maa Rent a Car</p>
        {items}
        <div className="mt-auto space-y-2 pt-4 text-sm">
          <a href="/book" target="_blank" rel="noreferrer" className="block text-emerald-700 hover:underline">
            Open customer booking form
          </a>
          {perm === "default" && (
            <button onClick={enableAlerts} className="text-left text-slate-500 hover:underline">
              Turn on alerts for new requests
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="font-semibold text-emerald-800">Maa Rent a Car</p>
            <a href="/book" target="_blank" rel="noreferrer" className="text-xs text-emerald-700">
              Booking form
            </a>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 py-2">{items}</nav>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
