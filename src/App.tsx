import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useNotes } from "./hooks/useNotes";
import { listNotes, restoreNote, setPinned } from "./lib/db";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "./lib/themes";
import {
  applyFont,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  readFont,
  type FontSetting,
} from "./lib/fonts";
import { TitleBar } from "./components/TitleBar";
import { Editor } from "./components/Editor";
import { StackDots } from "./components/StackDots";
import { SearchPanel } from "./components/SearchPanel";
import { Toast } from "./components/Toast";
import { ResizeHandles } from "./components/ResizeHandles";

const THEME_KEY = "archnote.theme";
const UNDO_TIMEOUT_MS = 5000;

function readTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}

function pinLabel(noteId: string) {
  return `pin-${noteId}`;
}

async function openPinWindow(noteId: string, focus = true) {
  const existing = await WebviewWindow.getByLabel(pinLabel(noteId));
  if (existing) {
    await existing.show();
    if (focus) await existing.setFocus();
    return;
  }
  new WebviewWindow(pinLabel(noteId), {
    url: `index.html?pin=${noteId}`,
    title: `archnote-pin:${noteId}`,
    width: 300,
    height: 240,
    minWidth: 200,
    minHeight: 160,
    resizable: true,
    decorations: false,
    transparent: true,
    skipTaskbar: true,
    focus,
    visible: true,
  });
}

async function closePinWindow(noteId: string) {
  const existing = await WebviewWindow.getByLabel(pinLabel(noteId));
  if (existing) {
    await existing.destroy();
  }
}

async function syncPinRules(noteIds: string[]) {
  await invoke("sync_pin_rules", { noteIds });
}

export default function App() {
  const {
    notes,
    index,
    current,
    loading,
    error,
    updateContent,
    goTo,
    goNext,
    goPrev,
    newNote,
    deleteCurrent,
    refresh,
    jumpToId,
    applyPinned,
    applyContent,
  } = useNotes();
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [font, setFont] = useState<FontSetting>(readFont);
  const [systemFamily, setSystemFamily] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: string; pinned: boolean } | null>(null);
  const wheelAccumulator = useRef(0);
  const wheelLockedUntil = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pinnedSetupDone = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    void emit("theme-changed", theme);
  }, [theme]);

  useEffect(() => {
    void invoke<{ family: string; weight: number }>("system_font")
      .then((value) => {
        setSystemFamily(value.family);
        localStorage.setItem("archnote.systemFamily", value.family);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    applyFont(font, systemFamily);
    localStorage.setItem("archnote.font", JSON.stringify(font));
    void emit("font-changed", { font, systemFamily });
  }, [font, systemFamily]);

  useEffect(() => {
    const win = getCurrentWindow();
    const title = error ? `Archnote · error: ${error}` : "Archnote";
    void win.setTitle(title).catch(() => undefined);
  }, [error]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("menu://new-note", () => {
      void newNote().then(() => textareaRef.current?.focus());
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [newNote]);

  useEffect(() => {
    let unlistenNote: (() => void) | undefined;
    let unlistenPin: (() => void) | undefined;
    listen<{ id: string; content: string }>("note-updated", (event) => {
      applyContent(event.payload.id, event.payload.content);
    }).then((fn) => {
      unlistenNote = fn;
    });
    listen<{ id: string }>("pin-unpinned", (event) => {
      applyPinned(event.payload.id, false);
    }).then((fn) => {
      unlistenPin = fn;
    });
    return () => {
      unlistenNote?.();
      unlistenPin?.();
    };
  }, [applyContent, applyPinned]);

  useEffect(() => {
    if (loading || pinnedSetupDone.current) return;
    pinnedSetupDone.current = true;
    const ids = notes.filter((note) => note.pinned).map((note) => note.id);
    void (async () => {
      await syncPinRules(ids);
      for (const id of ids) {
        await openPinWindow(id, false);
      }
    })();
  }, [loading, notes]);

  const handleNext = useCallback(() => {
    if (index >= notes.length - 1) {
      void newNote();
    } else {
      goNext();
    }
  }, [goNext, index, newNote, notes.length]);

  const handlePrev = useCallback(() => {
    goPrev();
  }, [goPrev]);

  const handleSelect = useCallback(
    (target: number) => {
      goTo(target);
    },
    [goTo],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void newNote().then(() => textareaRef.current?.focus());
      } else if (event.ctrlKey && event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.ctrlKey && event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      } else if (event.ctrlKey && event.shiftKey && event.key === "Backspace") {
        event.preventDefault();
        void handleDelete();
      } else if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.ctrlKey && !event.altKey && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        setFont((value) => ({
          ...value,
          size: Math.min(MAX_FONT_SIZE, Math.round((value.size + 1) * 2) / 2),
        }));
      } else if (event.ctrlKey && !event.altKey && event.key === "-") {
        event.preventDefault();
        setFont((value) => ({
          ...value,
          size: Math.max(MIN_FONT_SIZE, Math.round((value.size - 1) * 2) / 2),
        }));
      } else if (event.ctrlKey && !event.altKey && event.key === "0") {
        event.preventDefault();
        setFont((value) => ({ ...value, size: 16.5 }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
      const now = Date.now();
      if (now < wheelLockedUntil.current) return;
      wheelAccumulator.current += event.deltaX;
      if (wheelAccumulator.current > 90) {
        wheelAccumulator.current = 0;
        wheelLockedUntil.current = now + 350;
        handleNext();
      } else if (wheelAccumulator.current < -90) {
        wheelAccumulator.current = 0;
        wheelLockedUntil.current = now + 350;
        handlePrev();
      }
    },
    [handleNext, handlePrev],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      updateContent(content);
      if (current) void emit("note-updated", { id: current.id, content });
    },
    [current, updateContent],
  );

  const togglePin = useCallback(async () => {
    if (!current) return;
    const next = !current.pinned;
    await setPinned(current.id, next);
    applyPinned(current.id, next);
    const ids = notes.map((note) => (note.id === current.id ? { ...note, pinned: next ? 1 : 0 } : note));
    const pinnedIds = ids.filter((note) => note.pinned).map((note) => note.id);
    if (next) {
      await syncPinRules(pinnedIds);
      await openPinWindow(current.id);
    } else {
      await closePinWindow(current.id);
      void invoke("remove_pin_rule", { noteId: current.id });
    }
  }, [applyPinned, current, notes]);

  const handleDelete = useCallback(async () => {
    const note = current;
    if (!note) return;
    setUndo(null);
    if (note.pinned) {
      await closePinWindow(note.id);
      void invoke("remove_pin_rule", { noteId: note.id });
    }
    const deleted = await deleteCurrent();
    if (!deleted) return;
    setUndo({ id: deleted.id, pinned: !!deleted.pinned });
    window.setTimeout(() => {
      setUndo((value) => (value && value.id === deleted.id ? null : value));
    }, UNDO_TIMEOUT_MS);
  }, [current, deleteCurrent]);

  const handleUndo = useCallback(async () => {
    if (!undo) return;
    const target = undo;
    setUndo(null);
    await restoreNote(target.id);
    await refresh();
    jumpToId(target.id);
    if (target.pinned) {
      const latest = await listNotes();
      await syncPinRules(latest.filter((note) => note.pinned).map((note) => note.id));
      await openPinWindow(target.id);
    }
  }, [jumpToId, refresh, undo]);

  const wordCount = current ? (current.content.trim() ? current.content.trim().split(/\s+/).length : 0) : 0;

  return (
    <div className="window relative flex h-full flex-col overflow-hidden">
      <ResizeHandles />
      <TitleBar
        index={index}
        count={notes.length}
        pinned={!!current?.pinned}
        theme={theme}
        onThemeChange={setTheme}
        font={font}
        systemFamily={systemFamily}
        onFontChange={setFont}
        onNew={() => void newNote().then(() => textareaRef.current?.focus())}
        onSearch={() => setSearchOpen(true)}
        onTogglePin={() => void togglePin()}
        onDelete={() => void handleDelete()}
        onMinimize={() => void getCurrentWindow().minimize()}
        onHide={() => void getCurrentWindow().hide()}
      />

      <main className="relative flex min-h-0 flex-1 flex-col px-6 pb-2" onWheel={onWheel}>
        {loading ? (
          <div
            className="flex flex-1 items-center justify-center text-[11px]"
            style={{ color: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}
          >
            loading notes
          </div>
        ) : current ? (
          <AnimatePresence mode="wait" initial={false}>
            <Editor
              key={current.id}
              ref={textareaRef}
              noteId={current.id}
              content={current.content}
              direction={1}
              onChange={handleContentChange}
            />
          </AnimatePresence>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[12px]" style={{ color: "var(--ink-dim)" }}>
            No note here. Press Ctrl+N to start one.
          </div>
        )}
      </main>

      <footer className="flex h-9 shrink-0 items-center px-4">
        <div className="flex-1" />
        <StackDots count={notes.length} index={index} onSelect={handleSelect} />
        <div className="flex flex-1 justify-end">
          <span
            className="text-[10px] tabular-nums"
            style={{ color: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}
          >
            {wordCount === 1 ? "1 word" : `${wordCount} words`}
          </span>
        </div>
      </footer>

      {undo && (
        <Toast
          message="Note deleted"
          actionLabel="Undo"
          onAction={() => void handleUndo()}
        />
      )}

      {searchOpen && (
        <SearchPanel
          current={current}
          onClose={() => setSearchOpen(false)}
          onOpenNote={jumpToId}
          onNoteRestored={() => void refresh()}
        />
      )}

      {error && (
        <div
          className="absolute inset-x-3 bottom-10 z-40 rounded-[8px] border px-3 py-2 text-[11.5px]"
          style={{ background: "var(--bg-elev)", borderColor: "var(--accent)", color: "var(--ink)" }}
          role="alert"
        >
          Could not save: {error}
        </div>
      )}
    </div>
  );
}
