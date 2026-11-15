// One place for invoice maths. The frontend has the same formulas (frontend/src/lib/invoiceMath.js).
//   line total  = (quantity x rate - line discount) + line VAT on that amount
//   sub total   = sum of line totals
//   after disc. = sub total - discount (flat amount)
//   VAT / tax   = after discount x VAT %
//   grand total = after discount + VAT / tax + other charges
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function computeInvoice({ items = [], discount = 0, vatPercent = 0, otherCharges = 0 }) {
  const lines = items.map((it) => {
    const gross = round2(it.quantity * it.rate);
    const net = round2(gross - (it.discount || 0));
    const vat = round2((net * (it.vatPercent || 0)) / 100);
    return { ...it, lineTotal: round2(net + vat), net };
  });
  const subTotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const afterDiscount = round2(subTotal - discount);
  const vatAmount = round2((afterDiscount * vatPercent) / 100);
  const grandTotal = round2(afterDiscount + vatAmount + otherCharges);
  return { lines, subTotal, afterDiscount, vatAmount, grandTotal };
}

// Returns a message when something does not add up, otherwise null
export function checkInvoice(items, calc, discount) {
  for (const [i, it] of items.entries()) {
    if ((it.discount || 0) > round2(it.quantity * it.rate)) return `Item ${i + 1}: the discount is more than the amount`;
  }
  if (discount > calc.subTotal) return "The discount is more than the sub total";
  if (calc.grandTotal <= 0) return "The grand total must be more than zero";
  return null;
}
