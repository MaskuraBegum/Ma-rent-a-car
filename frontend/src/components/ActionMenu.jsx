import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// The "Actions" drop-down of a table row. items: [{ label, onClick?, to?, danger? }]
export default function ActionMenu({ items }) {
  const [pos, setPos] = useState(null); // null = closed
  const ref = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const outside = (e) => !ref.current?.contains(e.target) && close();
    const esc = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true); // a fixed menu would float away from its row
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggle = (e) => {
    if (pos) return setPos(null);
    const r = e.currentTarget.getBoundingClientRect();
    // fixed, so the table's own scrolling does not cut the menu off
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const cls = (danger) => `block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${danger ? "text-red-600" : "text-slate-700"}`;

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
      >
        Actions ▾
      </button>
      {pos && (
        <div role="menu" style={{ position: "fixed", top: pos.top, right: pos.right }} className="z-50 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((it) =>
            it.to ? (
              <Link key={it.label} to={it.to} role="menuitem" className={cls(it.danger)} onClick={() => setPos(null)}>
                {it.label}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={cls(it.danger)}
                onClick={() => {
                  setPos(null);
                  it.onClick();
                }}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
