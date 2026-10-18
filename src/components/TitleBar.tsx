import { ThemeMenu } from "./ThemeMenu";
import { FontMenu } from "./FontMenu";
import type { ThemeId } from "../lib/themes";
import type { FontSetting } from "../lib/fonts";
import { CloseIcon, MinusIcon, PinIcon, PlusIcon, SearchIcon, TrashIcon } from "./icons";

interface TitleBarProps {
  index: number;
  count: number;
  pinned: boolean;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  font: FontSetting;
  systemFamily: string;
  onFontChange: (font: FontSetting) => void;
  onNew: () => void;
  onSearch: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onMinimize: () => void;
  onHide: () => void;
}

export function TitleBar({
  index,
  count,
  pinned,
  theme,
  onThemeChange,
  font,
  systemFamily,
  onFontChange,
  onNew,
  onSearch,
  onTogglePin,
  onDelete,
  onMinimize,
  onHide,
}: TitleBarProps) {
  return (
    <header
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center justify-between pl-4 pr-2"
    >
      <div data-tauri-drag-region className="flex items-baseline gap-2.5">
        <span
          data-tauri-drag-region
          className="text-[12px] font-semibold tracking-[0.01em]"
          style={{ color: "var(--ink-dim)" }}
        >
          archnote
        </span>
        <span
          data-tauri-drag-region
          className="text-[10.5px] tabular-nums"
          style={{ color: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}
          aria-label={`Note ${index + 1} of ${count}`}
        >
          {index + 1}/{count}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="chrome-button"
          aria-label="Search notes"
          title="Search notes (Ctrl+F)"
          onClick={onSearch}
        >
          <SearchIcon />
        </button>
        <FontMenu setting={font} systemFamily={systemFamily} onChange={onFontChange} />
        <ThemeMenu theme={theme} onChange={onThemeChange} />
        <button
          type="button"
          className="chrome-button"
          data-active={pinned}
          aria-label={pinned ? "Unpin note from desktop" : "Pin note to desktop"}
          aria-pressed={pinned}
          title={pinned ? "Unpin note from desktop" : "Pin note to desktop"}
          onClick={onTogglePin}
        >
          <PinIcon />
        </button>
        <button
          type="button"
          className="chrome-button"
          aria-label="Delete note"
          title="Delete note (Ctrl+Shift+Backspace)"
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
        <button
          type="button"
          className="chrome-button"
          aria-label="New note"
          title="New note (Ctrl+N)"
          onClick={onNew}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          className="chrome-button"
          aria-label="Minimize"
          title="Minimize"
          onClick={onMinimize}
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          className="chrome-button"
          aria-label="Hide to tray"
          title="Hide to tray"
          onClick={onHide}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
