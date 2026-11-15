import { useMemo, useRef, useState } from "react";
import { inputCls } from "./ui.jsx";
import { KIND_LABEL, locationText, searchLocations } from "../lib/locations.js";

// A text box with suggestions from Bangladesh places (English or Bangla).
// Typing anything is still allowed: a house, a road or a place that is not in the list.
export default function LocationInput({ value, onChange, placeholder, required }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const loading = useRef(false);

  // the places list loads the first time someone clicks in
  const load = () => {
    if (list || loading.current) return;
    loading.current = true;
    import("../data/locations.json").then((m) => setList(m.default));
  };

  const results = useMemo(() => (list && open ? searchLocations(list, value) : []), [list, open, value]);

  const pick = (item) => {
    onChange(locationText(item));
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        onFocus={load}
        onChange={(e) => {
          load();
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {results.length > 0 && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((item, i) => (
            <li
              key={`${item.en}|${item.parent || ""}`}
              role="option"
              aria-selected={i === active}
              // mousedown, so the pick happens before the box loses focus
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-emerald-50" : ""}`}
            >
              <span className="font-medium">{item.en}</span>
              <span className="ml-2 text-slate-500">{item.bn}</span>
              <span className="block text-xs text-slate-400">
                {KIND_LABEL[item.kind]}
                {item.parent ? ` · ${item.parent}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
