import { useEffect, useState } from "react";
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

// the clipboard only accepts PNG images, so the photo is redrawn as a PNG
async function toPng(blob) {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d").drawImage(bmp, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Shows the ready message. The manager taps the green button and presses send inside WhatsApp.
export default function WhatsAppModal({ whatsapp, canConfirm, onClose, onConfirmSent }) {
  const [opened, setOpened] = useState(false);
  const [photoBlob, setPhotoBlob] = useState(null); // the driver's photo, loaded in advance so a tap can use it at once
  const [note, setNote] = useState("");
  const url = whatsapp ? links(whatsapp) : null;
  const photo = whatsapp?.photo;

  useEffect(() => {
    if (!photo) return;
    let gone = false;
    fetch(photo)
      .then((r) => r.blob())
      .then((b) => !gone && setPhotoBlob(b))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [photo]);

  // phone: opens the share sheet with the photo and the message together
  const sharePhoto = async () => {
    setNote("");
    try {
      const file = new File([photoBlob], "driver.jpg", { type: photoBlob.type || "image/jpeg" });
      if (!navigator.canShare?.({ files: [file] })) return setNote("This phone cannot share the photo. Use the green button for the text only.");
      await navigator.share({ files: [file], text: whatsapp.message });
      setOpened(true);
    } catch (e) {
      if (e.name !== "AbortError") setNote("Could not share the photo. Use the green button for the text only.");
    }
  };

  // computer: copies the photo, then it is pasted into the chat with Ctrl+V
  const copyPhoto = async () => {
    setNote("");
    try {
      const png = await toPng(photoBlob);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setNote("Photo copied. Open the chat below, click in the message box and press Ctrl+V.");
    } catch {
      setNote("Could not copy the photo. Save it from the link below and attach it in the chat.");
    }
  };

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

          {photo && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <img src={photo} alt="Driver" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1 basis-40">
                {isMobile ? (
                  <Button onClick={sharePhoto} disabled={!photoBlob} className="w-full">
                    {photoBlob ? "Send with driver photo" : "Loading photo..."}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={copyPhoto} disabled={!photoBlob} className="w-full sm:w-auto">
                    {photoBlob ? "Copy driver photo" : "Loading photo..."}
                  </Button>
                )}
              </div>
            </div>
          )}
          {note && <p className="mt-2 text-xs text-amber-700 [overflow-wrap:anywhere]">{note}</p>}

          <a
            href={url.main}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
            className="mt-4 block rounded-xl bg-[#25d366] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1ebe5a]"
          >
            {isMobile ? "Send text on WhatsApp" : "Send on WhatsApp Web"}
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
            {isMobile && photo
              ? "With the photo: choose WhatsApp and the customer's chat in the share list, then send. Without it: the green button opens the chat with the text ready."
              : "The chat opens with the message ready. Press send there."}
            {!isMobile && " WhatsApp Web must be logged in with the company number."}
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