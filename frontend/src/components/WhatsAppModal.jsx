import { useState } from "react";
import { Button, Modal } from "./ui.jsx";

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Direct links, built from the number and message the server prepared
function links(w) {
  const text = encodeURIComponent(w.message);
  return {
    // phone: opens the WhatsApp app. computer: opens WhatsApp Web straight into the chat
    main: isMobile
      ? `https://wa.me/${w.to}?text=${text}`
      : `https://web.whatsapp.com/send?phone=${w.to}&text=${text}`,
    // computer only: the WhatsApp desktop app, if it is installed
    app: `whatsapp://send?phone=${w.to}&text=${text}`,
  };
}

// Shows the ready message. The manager taps the green button and presses send inside WhatsApp.
export default function WhatsAppModal({ whatsapp, canConfirm, onClose, onConfirmSent }) {
  const [opened, setOpened] = useState(false);
  const url = whatsapp ? links(whatsapp) : null;

  return (
    <Modal title="Send driver details" onClose={onClose}>
      {!whatsapp ? (
        <p className="text-sm text-amber-700">
          There is no phone number to send to. Add the user's mobile number (or link a client that has one) with Edit, then
          try again.
        </p>
      ) : (
        <>
          <p className="mb-1 text-xs text-slate-500">
            To: <b>+{whatsapp.to}</b>
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{whatsapp.message}</pre>

          <a
            href={url.main}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
            className="mt-4 block rounded-xl bg-[#25d366] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1ebe5a]"
          >
            {isMobile ? "Send on WhatsApp" : "Send on WhatsApp Web"}
          </a>

          {!isMobile && (
            <a
              href={url.app}
              onClick={() => setOpened(true)}
              className="mt-2 block text-center text-sm text-emerald-700 underline"
            >
              Open in the WhatsApp desktop app instead
            </a>
          )}

          <p className="mt-2 text-xs text-slate-500">
            The chat opens with the message ready. Press send there.
            {!isMobile && " WhatsApp Web must be logged in with the company number."}
          </p>

          {opened && canConfirm && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium">Did you press send in WhatsApp?</p>
              <div className="mt-2 flex gap-2">
                <Button onClick={onConfirmSent}>Yes, it is sent</Button>
                <Button variant="secondary" onClick={() => setOpened(false)}>
                  Not yet
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}