import { useEffect, useRef, useState } from "react";
import { THEMES, type ThemeId } from "../lib/themes";
import { PaletteIcon } from "./icons";

interface ThemeMenuProps {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemeMenu({ theme, onChange }: ThemeMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="chrome-button"
        aria-label="Choose theme"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <PaletteIcon />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-8 z-50 w-48 rounded-[10px] border p-1.5"
            style={{
              background: "var(--bg-elev)",
              borderColor: "var(--line)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
            }}
            role="menu"
            aria-label="Themes"
          >
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={item.id === theme}
                className="flex w-full items-center gap-2.5 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                style={{ color: item.id === theme ? "var(--accent)" : "var(--ink-dim)" }}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <span className="flex overflow-hidden rounded-[4px] border" style={{ borderColor: "var(--line)" }}>
                  {item.swatches.map((color) => (
                    <span key={color} className="block h-3.5 w-3.5" style={{ background: color }} />
                  ))}
                </span>
                <span className="flex-1">{item.name}</span>
                {item.id === theme && <span className="text-[10px]">on</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
