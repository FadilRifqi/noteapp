import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  weightName,
  type FontSetting,
  type FontWeight,
} from "../lib/fonts";

interface FontMenuProps {
  setting: FontSetting;
  systemFamily: string;
  onChange: (setting: FontSetting) => void;
}

const WEIGHTS: FontWeight[] = [400, 500, 600];

export function FontMenu({ setting, systemFamily, onChange }: FontMenuProps) {
  const [open, setOpen] = useState(false);
  const [families, setFamilies] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || families.length > 0) return;
    void invoke<string[]>("list_font_families")
      .then(setFamilies)
      .catch(() => undefined);
  }, [open, families.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = query.trim()
    ? families.filter((family) => family.toLowerCase().includes(query.trim().toLowerCase()))
    : families;

  const clampSize = (value: number) =>
    Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value * 2) / 2));

  return (
    <div className="relative">
      <button
        type="button"
        className="chrome-button"
        aria-label="Change note font"
        aria-expanded={open}
        title="Note font"
        onClick={() => setOpen((value) => !value)}
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0 }}
      >
        Aa
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-8 z-50 w-64 rounded-[10px] border p-2"
            style={{
              background: "var(--bg-elev)",
              borderColor: "var(--line)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
            }}
            role="dialog"
            aria-label="Note font"
          >
            <button
              type="button"
              className="flex w-full flex-col gap-0.5 rounded-[7px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              style={{ color: setting.mode === "system" ? "var(--accent)" : "var(--ink)" }}
              onClick={() => onChange({ ...setting, mode: "system" })}
            >
              <span className="text-[12.5px]">System font</span>
              <span className="text-[10.5px]" style={{ color: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}>
                {systemFamily || "system-ui"} · {weightName(setting.weight)}
              </span>
            </button>

            <div className="my-1.5 h-px" style={{ background: "var(--line-soft)" }} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fonts"
              className="mb-1.5 w-full rounded-[6px] px-2 py-1 text-[11.5px] outline-none"
              style={{
                background: "var(--bg-raised)",
                color: "var(--ink)",
                caretColor: "var(--accent)",
              }}
              aria-label="Search fonts"
            />

            <div className="max-h-44 overflow-y-auto" role="listbox" aria-label="Fonts">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px]" style={{ color: "var(--ink-dim)" }}>
                  {families.length === 0 ? "loading fonts" : "no font matches"}
                </p>
              ) : (
                filtered.slice(0, 120).map((family) => {
                  const active = setting.mode === "family" && setting.family === family;
                  return (
                    <button
                      key={family}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className="block w-full truncate rounded-[6px] px-2 py-1 text-left text-[12px] transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                      style={{
                        color: active ? "var(--accent)" : "var(--ink-dim)",
                        fontFamily: `"${family}", var(--font-ui)`,
                      }}
                      onClick={() => onChange({ ...setting, mode: "family", family })}
                    >
                      {family}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-1.5 h-px" style={{ background: "var(--line-soft)" }} />

            <div className="mt-1.5 flex items-center gap-1">
              {WEIGHTS.map((weight) => (
                <button
                  key={weight}
                  type="button"
                  className="flex-1 rounded-[6px] px-1 py-1 text-[10.5px]"
                  style={{
                    background: setting.weight === weight ? "var(--bg-raised)" : "transparent",
                    color: setting.weight === weight ? "var(--accent)" : "var(--ink-dim)",
                  }}
                  onClick={() => onChange({ ...setting, weight })}
                >
                  {weightName(weight)}
                </button>
              ))}
            </div>

            <div className="mt-1.5 flex items-center justify-between rounded-[6px] px-1 py-1">
              <span className="text-[10.5px]" style={{ color: "var(--ink-dim)" }}>
                Size
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="chrome-button"
                  style={{ width: 22, height: 22, fontSize: 11 }}
                  aria-label="Decrease font size"
                  onClick={() => onChange({ ...setting, size: clampSize(setting.size - 1) })}
                >
                  A-
                </button>
                <span
                  className="w-12 text-center text-[10.5px] tabular-nums"
                  style={{ color: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}
                >
                  {setting.size}px
                </span>
                <button
                  type="button"
                  className="chrome-button"
                  style={{ width: 22, height: 22, fontSize: 11 }}
                  aria-label="Increase font size"
                  onClick={() => onChange({ ...setting, size: clampSize(setting.size + 1) })}
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
