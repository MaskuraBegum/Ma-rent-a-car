import PDFDocument from "pdfkit";
import { fmtDay } from "./reports/period.js";
import {
  COMPANY, GRAY, GREEN, INK, addFooters, bottomLimit, companyHeader, contentWidth, drawTable, money2, registerFonts,
} from "./reports/pdf.js";

const STATUS_LABEL = { draft: "DRAFT", sent: "SENT", partial: "PARTLY PAID", paid: "PAID", cancelled: "CANCELLED" };
const num = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function renderInvoicePdf(inv, res) {
  const isClient = inv.type === "client";
  const title = `${isClient ? "Invoice" : "Bill"} ${inv.invoiceNo}`;
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true, info: { Title: title, Author: COMPANY } });
  registerFonts(doc);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${inv.invoiceNo}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const width = contentWidth(doc);

  companyHeader(doc, isClient ? "INVOICE" : "BILL");
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.8).strokeColor(GREEN).stroke();
  doc.y += 10;

  // who, and the invoice details
  const top = doc.y;
  doc.font("R").fontSize(8.5).fillColor(GRAY).text(isClient ? "Bill to" : "Bill from", left, top);
  doc.font("B").fontSize(12).fillColor(INK).text(inv.billTo?.name || "-", left, doc.y, { width: width * 0.55 });
  const lines = [inv.billTo?.unitName, inv.billTo?.address, inv.billTo?.phone ? `+${inv.billTo.phone}` : null].filter(Boolean);
  for (const l of lines) doc.font("R").fontSize(9).fillColor(GRAY).text(l, left, doc.y, { width: width * 0.55 });
  const leftEnd = doc.y;

  const meta = [
    [`${isClient ? "Invoice" : "Bill"} no`, inv.invoiceNo],
    ["Date", fmtDay(inv.invoiceDate)],
    ["Estimated payment date", fmtDay(inv.dueDate)],
    inv.poNo ? ["P.O. / S.O. no", inv.poNo] : null,
    ["Status", STATUS_LABEL[inv.status] || inv.status],
  ].filter(Boolean);
  doc.y = top;
  for (const [k, v] of meta) {
    const y = doc.y;
    doc.font("R").fontSize(9).fillColor(GRAY).text(k, left + width * 0.6, y, { width: width * 0.2 });
    doc.font("B").fontSize(9).fillColor(INK).text(v, left + width * 0.8, y, { width: width * 0.2, align: "right" });
    doc.y = y + 14;
  }
  doc.y = Math.max(leftEnd, doc.y) + 14;
  doc.x = left;

  // items
  const columns = [
    { key: "sn", label: "SN", type: "number", weight: 0.5 },
    { key: "item", label: "Item", type: "text", weight: 3.6 },
    { key: "qty", label: "Qty", type: "number", weight: 0.8 },
    { key: "rate", label: "Rate", type: "money2", weight: 1.2 },
    { key: "discount", label: "Discount", type: "money2", weight: 1.1 },
    { key: "vat", label: "VAT %", type: "number", weight: 0.8 },
    { key: "total", label: "Total", type: "money2", weight: 1.3 },
  ];
  const rows = inv.items.map((it, i) => ({
    sn: i + 1,
    item: it.description ? `${it.name}\n${it.description}` : it.name,
    qty: it.quantity,
    rate: it.rate,
    discount: it.discount || 0,
    vat: it.vatPercent || 0,
    total: it.lineTotal,
  }));
  drawTable(doc, { columns, rows, totals: {} }, { totals: false });

  // totals
  if (doc.y + 150 > bottomLimit(doc)) doc.addPage();
  doc.y += 10;
  const bx = left + width * 0.5;
  const bw = width * 0.5;
  const kv = (label, value, bold = false, color = INK) => {
    const y = doc.y;
    doc.font(bold ? "B" : "R").fontSize(bold ? 11 : 9.5).fillColor(color);
    doc.text(label, bx, y, { width: bw * 0.55 });
    doc.text(value, bx + bw * 0.55, y, { width: bw * 0.45, align: "right" });
    doc.y = y + (bold ? 18 : 15);
  };
  kv("Sub total", money2(inv.subTotal));
  if (inv.discount) kv("Discount", `- ${money2(inv.discount)}`);
  if (inv.vatAmount) kv(`VAT / tax (${num(inv.vatPercent)}%)`, money2(inv.vatAmount));
  if (inv.otherCharges) kv("Other charges", money2(inv.otherCharges));
  doc.moveTo(bx, doc.y).lineTo(bx + bw, doc.y).lineWidth(0.5).strokeColor("#d1d5db").stroke();
  doc.y += 4;
  kv("Grand total", money2(inv.grandTotal), true, GREEN);
  if (inv.paidAmount > 0) {
    kv("Paid", money2(inv.paidAmount));
    kv("Balance due", money2(inv.balance), true);
  }

  if (inv.notes) {
    doc.y += 8;
    doc.font("B").fontSize(9).fillColor(INK).text("Notes", left, doc.y);
    doc.font("R").fontSize(9).fillColor(GRAY).text(inv.notes, left, doc.y + 2, { width: width * 0.5 });
  }

  // signatures
  if (doc.y + 100 > bottomLimit(doc)) doc.addPage();
  const y = doc.y + 60;
  doc.lineWidth(0.6).strokeColor(GRAY);
  doc.moveTo(left, y).lineTo(left + 160, y).stroke();
  doc.moveTo(left + width - 160, y).lineTo(left + width, y).stroke();
  doc.font("R").fontSize(8.5).fillColor(GRAY);
  doc.text("Authorized signature", left, y + 4, { width: 160 });
  doc.text(isClient ? "Received by" : "Supplier signature", left + width - 160, y + 4, { width: 160, align: "right" });

  addFooters(doc, { title });
  doc.end();
}
