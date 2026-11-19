import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

const fmt = (d) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

const Row = ({ label, children }) =>
  children ? (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  ) : null;

// Public page the customer opens from the WhatsApp message: no login, no menu
export default function TripCard() {
  const { token } = useParams();
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [badPhoto, setBadPhoto] = useState(false);

  useEffect(() => {
    api.get(`/public/trip/${token}`).then(setT).catch((e) => setError(e.message));
  }, [token]);

  const phone = t?.driver?.phone;
  const sameDay = t?.dropDate && fmt(t.dropDate) === fmt(t.date);

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-xl font-semibold text-emerald-900">Maa Rent a Car Private Service</h1>

        <div className="mt-5 rounded-2xl bg-white p-5 shadow">
          {error ? (
            <p className="py-6 text-center text-sm text-slate-600">{error}</p>
          ) : !t ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading...</p>
          ) : t.status === "cancelled" ? (
            <p className="py-6 text-center text-sm text-slate-600">Trip #{t.tripNo} has been cancelled. Please contact us if you need help.</p>
          ) : (
            <>
              <p className="mb-4 text-center text-sm text-slate-500">Your booking (Trip #{t.tripNo}) is confirmed</p>

              <div className="flex flex-col items-center text-center">
              {t.driver.photo && !badPhoto ? (
                  <img src={t.driver.photo} alt={t.driver.name} onError={() => setBadPhoto(true)} className="h-32 w-32 rounded-full object-cover shadow" />
                ) : (
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-emerald-100 text-4xl font-semibold text-emerald-800">
                    {(t.driver.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="mt-3 text-lg font-semibold">{t.driver.name}</p>
                <p className="text-xs text-slate-500">Your driver</p>
                {phone && (
                  <a href={`tel:+${phone}`} className="mt-3 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white">
                    Call +{phone}
                  </a>
                )}
              </div>

              <div className="mt-5">
                <Row label="Car">{t.car?.name}</Row>
                <Row label="Plate number">{t.car?.plate}</Row>
                {t.car?.seats && <Row label="Seats">{`${t.car.seats}${t.car.ac ? ", AC" : ""}`}</Row>}
                <Row label="Date">{`${fmt(t.date)}${t.startTime ? ` at ${t.startTime}` : ""}`}</Row>
                {t.dropDate && !sameDay && <Row label="Drop date">{fmt(t.dropDate)}</Row>}
                <Row label="Pickup">{t.pickupLocation}</Row>
                <Row label="Drop">{t.dropLocation}</Row>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Thank you for choosing us.</p>
      </div>
    </div>
  );
}