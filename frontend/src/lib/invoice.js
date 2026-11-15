// Same formulas as the server (backend/src/services/invoiceMath.js), so the form can show totals while typing.
//   line total  = (quantity x rate - line discount) + line VAT on that amount
//   sub total   = sum of line totals
//   VAT / tax   = (sub total - discount) x VAT %
//   grand total = sub total - discount + VAT / tax + other charges
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const n = (v) => Number(v) || 0;

export function computeInvoice({ items = [], discount = 0, vatPercent = 0, otherCharges = 0 }) {
  const lines = items.map((it) => {
    const gross = round2(n(it.quantity) * n(it.rate));
    const net = round2(gross - n(it.discount));
    const vat = round2((net * n(it.vatPercent)) / 100);
    return { gross, net, lineTotal: round2(net + vat) };
  });
  const subTotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const afterDiscount = round2(subTotal - n(discount));
  const vatAmount = round2((afterDiscount * n(vatPercent)) / 100);
  const grandTotal = round2(afterDiscount + vatAmount + n(otherCharges));
  return { lines, subTotal, afterDiscount, vatAmount, grandTotal };
}

// client invoice or vendor bill: the words used on screen
export const PARTY = {
  client: { word: "Invoice", bn: "ইনভয়েস", plural: "Invoices", party: "Client", partyBn: "ক্লায়েন্ট", billTo: "Bill to", total: "Invoiced", paid: "Received", due: "Due" },
  vendor: { word: "Bill", bn: "বিল", plural: "Bills", party: "Vendor", partyBn: "সরবরাহকারী", billTo: "Bill from", total: "Billed", paid: "Paid", due: "Payable" },
};

export const STATUS_LABEL = {
  draft: "Draft", sent: "Sent", unpaid: "Unpaid", partial: "Partly paid", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};
export const STATUS_TONE = { draft: "slate", sent: "blue", unpaid: "amber", partial: "amber", paid: "green", overdue: "red", cancelled: "slate" };

// the Status dropdown of the form. Receivable = money the client still owes. For a vendor bill it is payable.
export const statusOptions = (type) => {
  const r = type === "client" ? "Receivable" : "Payable";
  return [
    ["draft", "Draft"],
    ["sent", `Sent (${r})`],
    ["unpaid", `Unpaid (${r})`],
    ["partial", `Partial (${r})`],
    ["paid", "Paid"],
    ["overdue", `Overdue (${r})`],
  ];
};
