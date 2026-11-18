import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../api.js";

// Left menu: groups open and close. A group with only "to" is a single link.
const NAV = [
  { label: "Dashboard", bn: "ড্যাশবোর্ড", to: "/dashboard" },
  {
    label: "Trips", bn: "ট্রিপ",
    items: [
      { to: "/", label: "Trip list", bn: "ট্রিপ তালিকা", end: true, badge: true },
      { to: "/trips/new", label: "New trip", bn: "নতুন ট্রিপ" },
    ],
  },
  {
    label: "Client", bn: "ক্লায়েন্ট",
    items: [
      { to: "/invoices/client/new", label: "New invoice", bn: "ইনভয়েস" },
      { to: "/invoices/client", label: "Invoice list", bn: "তালিকা", end: true },
      { to: "/statements/client", label: "Statement", bn: "বিবরণী" },
      { to: "/clients", label: "Clients", bn: "ক্লায়েন্ট তালিকা" },
    ],
  },
  {
    label: "Purchase", bn: "ক্রয়",
    items: [
      { to: "/purchases/new", label: "New purchase", bn: "নতুন ক্রয়" },
      { to: "/purchases", label: "Purchase list", bn: "ক্রয় তালিকা", end: true },
    ],
  },
  {
    label: "Inventory", bn: "ইনভেন্টরি",
    items: [
      { to: "/inventory/items", label: "Stock items", bn: "আইটেম", end: true },
      { to: "/inventory/items/new", label: "Add item", bn: "নতুন আইটেম" },
      { to: "/inventory/categories", label: "Categories", bn: "ক্যাটাগরি" },
      { to: "/inventory/units", label: "Units", bn: "একক" },
    ],
  },
  {
    label: "Supplier", bn: "সরবরাহকারী",
    items: [
      { to: "/invoices/vendor/new", label: "New bill", bn: "বিল" },
      { to: "/invoices/vendor", label: "Bill list", bn: "তালিকা", end: true },
      { to: "/statements/vendor", label: "Statement", bn: "বিবরণী" },
      { to: "/vendors", label: "Vendors", bn: "সরবরাহকারী তালিকা" },
    ],
  },
  {
    label: "Fleet", bn: "ফ্লিট",
    items: [
      { to: "/cars", label: "Vehicles", bn: "যানবাহন" },
      { to: "/drivers", label: "Drivers", bn: "চালক" },
    ],
  },
  {
    label: "Maintenance", bn: "মেইনটেন্যান্স",
    items: [
      { to: "/maintenance/new", label: "New log", bn: "নতুন লগ" },
      { to: "/maintenance", label: "Log list", bn: "লগ তালিকা", end: true },
    ],
  },
  {
    label: "Transactions", bn: "লেনদেন",
    items: [
      { to: "/transactions", label: "Cash entry", bn: "নগদ লেনদেন", end: true },
      { to: "/transactions/accounts", label: "Accounts", bn: "হিসাব" },
    ],
  },
  {
    label: "Banking", bn: "ব্যাংকিং",
    items: [
      { to: "/banking", label: "Banking", bn: "ব্যাংকিং" },
      { to: "/chart-of-accounts", label: "Chart of accounts", bn: "হিসাবের তালিকা" },
    ],
  },
  { label: "Staff", bn: "স্টাফ", to: "/staff" },
  { label: "Expenses", bn: "খরচ", to: "/expenses" },
  { label: "Report", bn: "রিপোর্ট", to: "/reports" },
  {
    label: "Accounts", bn: "হিসাব",
    items: [
      { to: "/ledger/driver", label: "Driver dues", bn: "চালকের পাওনা" },
      { to: "/ledger/vendor", label: "Vendor dues", bn: "ভেন্ডরের পাওনা" },
    ],
  },
];

const DHAKA = "Asia/Dhaka";
const clock = (d) => {
  const date = d.toLocaleDateString("en-GB", { timeZone: DHAKA, day: "2-digit", month: "2-digit", year: "numeric" });
  const day = d.toLocaleDateString("en-US", { timeZone: DHAKA, weekday: "short" }).toUpperCase();
  const time = d.toLocaleTimeString("en-GB", { timeZone: DHAKA, hour12: false });
  return `${date} ${day} - ${time}`;
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

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

const groupHas = (g, path) => g.items?.some((i) => path === i.to || (i.to !== "/" && path.startsWith(i.to)));

export default function Layout() {
  const count = useNewRequests();
  const now = useClock();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(() => window.innerWidth >= 768);
  const [open, setOpen] = useState(() => new Set(NAV.filter((g) => groupHas(g, pathname)).map((g) => g.label)));
  const [perm, setPerm] = useState("Notification" in window ? Notification.permission : "denied");

  // the group of the page you are on stays open; on a phone the menu closes after choosing
  useEffect(() => {
    const g = NAV.find((x) => groupHas(x, pathname));
    if (g) setOpen((s) => (s.has(g.label) ? s : new Set(s).add(g.label)));
    if (window.innerWidth < 768) setMenuOpen(false);
  }, [pathname]);

  const toggle = (label) =>
    setOpen((s) => {
      const next = new Set(s);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const linkCls = ({ isActive }) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
      isActive ? "bg-emerald-700 font-medium text-white" : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen md:flex">
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)} />}

      <aside
        className={`${
          menuOpen ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white p-3 md:sticky md:top-0 md:h-screen md:shrink-0`}
      >
        <p className="px-2 pb-1 pt-1 text-lg font-semibold leading-tight text-emerald-800">Maa Rent a Car</p>
        <p className="mb-3 px-2 text-xs text-slate-500">পরিবহন হিসাব</p>

        <nav className="space-y-1">
          {NAV.map((g) =>
            g.to ? (
              <NavLink key={g.label} to={g.to} className={linkCls}>
                <span>
                  {g.label} <span className="text-xs opacity-70">({g.bn})</span>
                </span>
              </NavLink>
            ) : (
              <div key={g.label}>
                <button
                  type="button"
                  onClick={() => toggle(g.label)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 ${
                    groupHas(g, pathname) ? "text-emerald-800" : "text-slate-700"
                  }`}
                  aria-expanded={open.has(g.label)}
                >
                  <span>
                    {g.label} <span className="text-xs font-normal opacity-70">({g.bn})</span>
                  </span>
                  <span className={`text-slate-400 transition ${open.has(g.label) ? "rotate-180" : ""}`}>▾</span>
                </button>
                {open.has(g.label) && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-2">
                    {g.items.map((i) => (
                      <NavLink key={i.to} to={i.to} end={i.end} className={linkCls}>
                        <span>
                          {i.label} <span className="text-xs opacity-70">({i.bn})</span>
                        </span>
                        {i.badge && count > 0 && <span className="rounded-full bg-red-600 px-2 text-xs text-white">{count}</span>}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </nav>

        <div className="mt-auto space-y-2 pt-4 text-sm">
          <a href="/book" target="_blank" rel="noreferrer" className="block text-emerald-700 hover:underline">
            Open customer booking form
          </a>
          {perm === "default" && (
            <button onClick={async () => setPerm(await Notification.requestPermission())} className="text-left text-slate-500 hover:underline">
              Turn on alerts for new requests
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-lg leading-none text-slate-600 hover:bg-slate-50"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            ☰
          </button>
          <p className="font-semibold text-emerald-800">Maa Rent a Car</p>
          <span className="ml-auto hidden text-sm tabular-nums text-slate-600 sm:inline">{clock(now)}</span>
          <Link to="/" className="relative rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" title="New booking requests">
            Requests
            {count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-xs text-white">{count}</span>}
          </Link>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
