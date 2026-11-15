import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fmtDay } from "./period.js";

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "assets");
const FONT_REGULAR = path.join(ASSETS, "fonts", "NotoSansBengali-Regular.ttf");
const FONT_BOLD = path.join(ASSETS, "fonts", "NotoSansBengali-Bold.ttf");
const LOGO = path.join(ASSETS, "logo.png"); // optional: put the company logo here

export const COMPANY = "Maa Rent a Car Private Service";
export const GREEN = "#065f46";
export const GRAY = "#6b7280";
export const INK = "#111827";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US")}`;
export const money2 = (n) =>
  `৳${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const number = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function formatCell(type, v) {
  if (v === null || v === undefined || v === "") return "-";
  if (type === "money") return money(v);
  if (type === "money2") return money2(v);
  if (type === "number") return number(v);
  if (type === "date") return fmtDay(v);
  return String(v);
}

export const bottomLimit = (doc) => doc.page.height - doc.page.margins.bottom - 18; // 18 = room for the footer
export const contentWidth = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

export function drawTable(doc, group, { totals: showTotals = true } = {}) {
  const { columns, rows, totals } = group;
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const weightSum = columns.reduce((s, c) => s + (c.weight || 1), 0);
  const widths = columns.map((c) => (width * (c.weight || 1)) / weightSum);
  const aligns = columns.map((c) => (["money", "money2", "number"].includes(c.type) ? "right" : "left"));
  const PAD = 4;

  const drawRow = (cells, style = {}, canBreak = true) => {
    doc.font(style.bold ? "B" : "R").fontSize(8.5);
    const h = Math.max(...cells.map((t, i) => doc.heightOfString(t, { width: widths[i] - PAD * 2 }))) + PAD * 2;
    if (canBreak && doc.y + h > bottomLimit(doc)) {
      doc.addPage();
      drawHeader();
    }
    doc.font(style.bold ? "B" : "R").fontSize(8.5);
    const y = doc.y;
    if (style.fill) doc.save().rect(left, y, width, h).fill(style.fill).restore();
    doc.fillColor(INK);
    let x = left;
    cells.forEach((t, i) => {
      doc.text(t, x + PAD, y + PAD, { width: widths[i] - PAD * 2, align: aligns[i] });
      x += widths[i];
    });
    doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(0.4).strokeColor("#d1d5db").stroke();
    doc.x = left;
    doc.y = y + h;
  };

  const drawHeader = () => drawRow(columns.map((c) => c.label), { bold: true, fill: "#e5efe9" }, false);

  drawHeader();
  for (const r of rows) drawRow(columns.map((c) => formatCell(c.type, r[c.key])));

  if (!showTotals) return;
  const firstSum = columns.findIndex((c) => c.key in totals);
  const labelAt = Math.max(0, firstSum - 1);
  drawRow(
    columns.map((c, i) => (c.key in totals ? formatCell(c.type, totals[c.key]) : i === labelAt ? "Total" : "")),
    { bold: true, fill: "#f3f4f6" }
  );
}

export function companyHeader(doc, rightText) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  let textX = left;
  if (fs.existsSync(LOGO)) {
    doc.image(LOGO, left, doc.y, { fit: [48, 48] });
    textX = left + 58;
  }
  const top = doc.y;
  doc.font("B").fontSize(16).fillColor(GREEN).text(COMPANY, textX, top, { width: width - (textX - left) });
  if (rightText) {
    doc.font("B").fontSize(20).fillColor(GREEN).text(rightText, left, top, { width, align: "right" });
  }
  doc.y = Math.max(doc.y, top + (fs.existsSync(LOGO) ? 52 : 0)) + 6;
  doc.x = left;
}

function drawSummary(doc, summary) {
  if (!summary?.length) return;
  const left = doc.page.margins.left;
  const gap = 8;
  const boxW = (contentWidth(doc) - gap * (summary.length - 1)) / summary.length;
  const y = doc.y;
  summary.forEach((s, i) => {
    const x = left + i * (boxW + gap);
    doc.save().roundedRect(x, y, boxW, 38, 4).fill("#f3f4f6").restore();
    doc.font("R").fontSize(8).fillColor(GRAY).text(s.label, x + 8, y + 6, { width: boxW - 16, lineBreak: false });
    doc.font("B").fontSize(12).fillColor(INK).text(formatCell(s.type, s.value), x + 8, y + 19, { width: boxW - 16, lineBreak: false });
  });
  doc.x = left;
  doc.y = y + 50;
}

function standardReport(doc, report) {
  const left = doc.page.margins.left;
  companyHeader(doc);
  doc.font("B").fontSize(13).fillColor(INK).text(report.title, left, doc.y);
  doc.font("R").fontSize(9).fillColor(GRAY).text([`Period: ${report.period}`, ...report.filters].join("   |   "), left, doc.y + 2);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}`, left, doc.y);
  doc.moveDown(0.6);
  doc.moveTo(left, doc.y).lineTo(left + contentWidth(doc), doc.y).lineWidth(0.8).strokeColor(GREEN).stroke();
  doc.y += 10;

  drawSummary(doc, report.summary);

  if (report.groups.length === 0) {
    doc.font("R").fontSize(10).fillColor(GRAY).text("No records found for this period.", left, doc.y + 6);
    return;
  }
  for (const group of report.groups) {
    if (group.heading) {
      if (doc.y + 70 > bottomLimit(doc)) doc.addPage();
      doc.font("B").fontSize(11).fillColor(GREEN).text(group.heading, left, doc.y + 6);
      for (const line of group.meta || []) doc.font("R").fontSize(8.5).fillColor(GRAY).text(line, left, doc.y);
      doc.y += 4;
    }
    drawTable(doc, group);
    doc.y += 12;
  }
}

function invoices(doc, report) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const today = fmtDay(new Date());

  if (report.groups.length === 0) {
    companyHeader(doc, "INVOICE");
    doc.font("R").fontSize(10).fillColor(GRAY).text(`No completed trips found for ${report.period}.`, left, doc.y + 10);
    return;
  }

  report.groups.forEach((group, index) => {
    if (index > 0) doc.addPage();
    companyHeader(doc, "INVOICE");
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.8).strokeColor(GREEN).stroke();
    doc.y += 10;

    const top = doc.y;
    doc.font("R").fontSize(8.5).fillColor(GRAY).text("Bill to", left, top);
    doc.font("B").fontSize(12).fillColor(INK).text(group.heading, left, doc.y, { width: width * 0.6 });
    for (const line of group.meta || []) doc.font("R").fontSize(9).fillColor(GRAY).text(line, left, doc.y, { width: width * 0.6 });
    const leftEnd = doc.y;

    doc.font("R").fontSize(9).fillColor(GRAY).text(`Billing period: ${report.period}`, left, top, { width, align: "right" });
    doc.text(`Date: ${today}`, left, doc.y, { width, align: "right" });
    doc.y = Math.max(leftEnd, doc.y) + 14;
    doc.x = left;

    doc.font("B").fontSize(10).fillColor(INK).text("Duty chart", left, doc.y);
    doc.y += 4;
    drawTable(doc, group);

    doc.font("B").fontSize(11).fillColor(INK).text(`Total amount: ${money(group.totals.rent)}`, left, doc.y + 10, { width, align: "right" });

    // signature lines
    if (doc.y + 100 > bottomLimit(doc)) doc.addPage();
    const y = doc.y + 60;
    doc.lineWidth(0.6).strokeColor(GRAY);
    doc.moveTo(left, y).lineTo(left + 160, y).stroke();
    doc.moveTo(left + width - 160, y).lineTo(left + width, y).stroke();
    doc.font("R").fontSize(8.5).fillColor(GRAY);
    doc.text("Authorized signature", left, y + 4, { width: 160 });
    doc.text("Received by", left + width - 160, y + 4, { width: 160, align: "right" });
  });
}

export function addFooters(doc, report) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const m = doc.page.margins;
    const savedBottom = m.bottom;
    m.bottom = 0; // writing below the margin would otherwise add a new page
    const y = doc.page.height - 26;
    const width = contentWidth(doc);
    doc.font("R").fontSize(8).fillColor(GRAY);
    doc.text(`${COMPANY} · ${report.title}`, m.left, y, { width: width * 0.7, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, m.left, y, { width, align: "right", lineBreak: false });
    m.bottom = savedBottom;
  }
}

export function registerFonts(doc) {
  doc.registerFont("R", FONT_REGULAR);
  doc.registerFont("B", FONT_BOLD);
}

export function renderPdf(report, res, filename) {
  const doc = new PDFDocument({
    size: "A4",
    layout: report.layout === "landscape" ? "landscape" : "portrait",
    margin: 36,
    bufferPages: true,
    info: { Title: report.title, Author: COMPANY },
  });
  registerFonts(doc);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  doc.pipe(res);

  if (report.style === "invoice") invoices(doc, report);
  else standardReport(doc, report);

  addFooters(doc, report);
  doc.end();
}
