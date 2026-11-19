import { useState } from "react";
import { Button, Modal } from "./ui.jsx";

const ua = navigator.userAgent;
const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
// WhatsApp has no official Linux app, so the website works best there
const isLinuxDesktop = /Linux/i.test(ua) && !/Android/i.test(ua);

// Direct links, built from the number and message the server prepared
function links(w) {
  const text = encodeURIComponent(w.message);
  return {
    // opens an installed WhatsApp app (phone, Windows, Mac)
    app: `whatsapp://send?phone=${w.to}&text=${text}`,
    // opens WhatsApp on the website: works on any computer logged in to WhatsApp Web
    web: isMobile ? `https://wa.me/${w.to}?text=${text}` : `https://web.whatsapp.com/send?phone=${w.to}&text=${text}`,
  };
}

const FIRST = "mt-4 block rounded-xl bg-[#25d366] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1ebe5a]";
const SECOND = "mt-2 block rounded-xl border-2 border-[#25d366] px-4 py-3 text-center text-base font-semibold text-emerald-800 hover:bg-emerald-50";

// Shows the ready message. The manager picks a button and presses send inside WhatsApp.
export default function WhatsAppModal({ whatsapp, canConfirm, onClose, onConfirmSent }) {
  const [opened, setOpened] = useState(false);
  const url = whatsapp ? links(whatsapp) : null;

  const web = { href: url?.web, label: "Send through WhatsApp Web", external: true };
  const app = { href: url?.app, label: "Open in WhatsApp app", external: false };
  const options = isLinuxDesktop ? [web, app] : [app, web];

  return (
    <Modal title="Send driver details" onClose={onClose}>
      {!whatsapp ? (
        <p className="text-sm text-amber-700">
          There is no phone number to send to. Add the user's mobile number (or link a client that has one) with Edit, then
          try again.
        </p>
      ) : (
        <div className="min-w-0 max-w-full">
          <p className="mb-1 text-xs text-slate-500">
            To: <b>+{whatsapp.to}</b>
          </p>

          {/* long links wrap instead of pushing the window wider */}
          <pre className="max-h-64 max-w-full overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm [overflow-wrap:anywhere]">
            {whatsapp.message}
          </pre>

          {options.map((o, i) => (
            <a
              key={o.label}
              href={o.href}
              {...(o.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => setOpened(true)}
              className={i === 0 ? FIRST : SECOND}
            >
              {o.label}
            </a>
          ))}

          <p className="mt-2 text-xs text-slate-500">
            The chat opens with the message ready. Press send there.
            {isLinuxDesktop
              ? " On Linux use the website button: log in to WhatsApp Web once and it stays logged in."
              : " WhatsApp must be logged in with the company number."}
          </p>

          {opened && canConfirm && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium">Did you press send in WhatsApp?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={onConfirmSent}>Yes, it is sent</Button>
                <Button variant="secondary" onClick={() => setOpened(false)}>
                  Not yet
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}