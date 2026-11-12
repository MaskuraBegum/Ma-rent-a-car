export const normalizeBDPhone = (input) => {
    let d = String(input).replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0")) d = "88" + d;        // 01712345678 -> 8801712345678
    else if (d.length === 10) d = "880" + d;    // 1712345678  -> 8801712345678
    return /^8801[3-9]\d{8}$/.test(d) ? d : null;
  };
  