import { useCallback, useEffect, useRef, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getNote, saveNote, setPinned, type Note } from "../lib/db";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../lib/themes";
import { applyFont, readFont, readSystemFamily, type FontSetting } from "../lib/fonts";
import { CloseIcon } from "./icons";
import { ResizeHandles } from "./ResizeHandles";

const SAVE_DEBOUNCE_MS = 250;
const THEME_KEY = "archnote.theme";

function readTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}

export function PinNote({ noteId }: { noteId: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [font, setFont] = useState<FontSetting>(readFont);
  const [systemFamily, setSystemFamily] = useState(readSystemFamily);
  const [missing, setMissing] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const unpinning = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    applyFont(font, systemFamily);
  }, [font, systemFamily]);

  useEffect(() => {
    let cancelled = false;
    void getNote(noteId).then((found) => {
      if (cancelled) return;
      if (!found) {
        setMissing(true);
        return;
      }
      setNote(found);
      setContent(found.content);
    });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ id: string; content: string }>("note-updated", (event) => {
      if (event.payload.id === noteId) {
        setContent((current) => (current === event.payload.content ? current : event.payload.content));
      }
    }).then((fn) => {
      unlisten = fn;
    });
    let unlistenTheme: (() => void) | undefined;
    listen<ThemeId>("theme-changed", (event) => {
      setTheme(event.payload);
      localStorage.setItem(THEME_KEY, event.payload);
    }).then((fn) => {
      unlistenTheme = fn;
    });
    let unlistenFont: (() => void) | undefined;
    listen<{ font: FontSetting; systemFamily: string }>("font-changed", (event) => {
      setFont(event.payload.font);
      setSystemFamily(event.payload.systemFamily);
      localStorage.setItem("archnote.font", JSON.stringify(event.payload.font));
      localStorage.setItem("archnote.systemFamily", event.payload.systemFamily);
    }).then((fn) => {
      unlistenFont = fn;
    });
    return () => {
      unlisten?.();
      unlistenTheme?.();
      unlistenFont?.();
    };
  }, [noteId]);

  const unpin = useCallback(async () => {
    if (unpinning.current) return;
    unpinning.current = true;
    try {
      await setPinned(noteId, false);
      await invoke("remove_pin_rule", { noteId });
      await emit("pin-unpinned", { id: noteId });
    } finally {
      await getCurrentWindow().destroy();
    }
  }, [noteId]);

  const onChange = (value: string) => {
    setContent(value);
    void emit("note-updated", { id: noteId, content: value });
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveNote(noteId, value);
    }, SAVE_DEBOUNCE_MS);
  };

  if (missing) {
    return (
      <div className="window flex h-full flex-col items-center justify-center gap-2 text-[12px]">
        <span style={{ color: "var(--ink-dim)" }}>This note is gone.</span>
        <button type="button" className="panel-action" onClick={() => void getCurrentWindow().destroy()}>
          close
        </button>
      </div>
    );
  }

  return (
    <div className="window relative flex h-full flex-col overflow-hidden">
      <ResizeHandles />
      <header
        data-tauri-drag-region
        className="flex h-7 shrink-0 items-center justify-between px-2"
      >
        <span
          data-tauri-drag-region
          className="text-[9.5px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}
        >
          pinned
        </span>
        <button
          type="button"
          className="chrome-button"
          style={{ width: 22, height: 22 }}
          aria-label="Unpin note"
          title="Unpin note"
          onClick={() => void unpin()}
        >
          <CloseIcon size={13} />
        </button>
      </header>
      <div className="min-h-0 flex-1 px-3 pb-2">
        <textarea
          className="editor"
          style={{ lineHeight: 1.55 }}
          value={content}
          placeholder={note ? "" : "loading"}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Pinned note text"
        />
      </div>
    </div>
  );
}
