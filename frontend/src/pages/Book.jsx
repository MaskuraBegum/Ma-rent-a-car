import { useState } from "react";
import { api } from "../api.js";
import { Field, inputCls } from "../components/ui.jsx";
import { dhakaToday } from "../utils.js";

const start = { name: "", whatsapp: "+880", date: "", time: "", location: "", vehicleType: "", notes: "", website: "" };

// Public page for customers: simple, mobile first, no login
export default function Book() {
  const [v, setV] = useState(start);
  const [state, setState] = useState({ status: "form", error: "", tripNo: null });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "sending", error: "", tripNo: null });
    try {
      const body = {};
      for (const [k, val] of Object.entries(v)) if (val.trim() !== "") body[k] = val.trim();
      const r = await api.post("/public/booking", body);
      setState({ status: "done", error: "", tripNo: r.tripNo });
      setV(start);
    } catch (err) {
      setState({ status: "form", error: err.message, tripNo: null });
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-center text-2xl font-semibold text-emerald-900">Maa Rent a Car Private Service</h1>
        <p className="mb-5 mt-1 text-center text-sm text-slate-600">Tell us where and when you need a car. We will confirm on WhatsApp.</p>

        <div className="rounded-2xl bg-white p-5 shadow">
          {state.status === "done" ? (
            <div className="py-6 text-center">
              <p className="text-lg font-semibold text-emerald-800">Thank you! We got your request.</p>
              {state.tripNo && <p className="mt-1 text-sm text-slate-500">Request number {state.tripNo}</p>}
              <p className="mt-3 text-sm text-slate-600">We will confirm on WhatsApp shortly.</p>
              <button onClick={() => setState({ status: "form", error: "", tripNo: null })} className="mt-5 text-sm text-emerald-700 underline">
                Send another request
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Field label="Your name *">
                <input required className={inputCls} value={v.name} onChange={set("name")} />
              </Field>
              <Field label="WhatsApp number *" hint="We will send the driver details to this number">
                <input required type="tel" inputMode="tel" className={inputCls} value={v.whatsapp} onChange={set("whatsapp")} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pickup date *">
                  <input required type="date" min={dhakaToday()} className={inputCls} value={v.date} onChange={set("date")} />
                </Field>
                <Field label="Pickup time *">
                  <input required type="time" className={inputCls} value={v.time} onChange={set("time")} />
                </Field>
              </div>
              <Field label="Pickup place and where you are going *">
                <input required className={inputCls} value={v.location} onChange={set("location")} placeholder="Uttara to Purbachal" />
              </Field>
              <Field label="Type of car (if you have a choice)">
                <input className={inputCls} value={v.vehicleType} onChange={set("vehicleType")} placeholder="Noah, Hiace, private car" />
              </Field>
              <Field label="Anything else we should know">
                <textarea rows={2} className={inputCls} value={v.notes} onChange={set("notes")} />
              </Field>

              {/* hidden trap for bots: real people never see or fill it */}
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px]"
                value={v.website}
                onChange={set("website")}
              />

              {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

              <button
                type="submit"
                disabled={state.status === "sending"}
                className="w-full rounded-xl bg-emerald-700 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {state.status === "sending" ? "Sending..." : "Send request"}
              </button>
              <p className="text-center text-xs text-slate-500">This is a request, not a confirmed booking. We will reply on WhatsApp.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
