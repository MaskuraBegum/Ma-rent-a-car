// Search over the Bangladesh places list: English or Bangla, any part of the name.
const norm = (s) => String(s).toLowerCase().normalize("NFC");
const KIND_BONUS = { district: 6, area: 5, place: 4, upazila: 0 };
export const KIND_LABEL = { place: "Place", area: "Area", district: "District", upazila: "Upazila" };

export function searchLocations(list, query, limit = 8) {
  const q = norm(query).trim();
  if (!q) return [];

  const scored = [];
  for (const item of list) {
    let best = 0;
    for (const name of [item.en, item.bn, ...(item.alt || [])]) {
      const n = norm(name);
      let s = 0;
      if (n === q) s = 100;
      else if (n.startsWith(q)) s = 80;
      else if (n.split(/[\s,\-/]+/).some((w) => w.startsWith(q))) s = 60;
      else if (q.length >= 3 && n.includes(q)) s = 40;
      if (s > best) best = s;
    }
    if (best) scored.push({ item, score: best + (KIND_BONUS[item.kind] || 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.item.en.length - b.item.en.length);
  return scored.slice(0, limit).map((x) => x.item);
}

// the text that goes into the box: "Uttara, Dhaka"
export const locationText = (item) =>
  item.parent && item.parent !== item.en ? `${item.en}, ${item.parent}` : item.en;
