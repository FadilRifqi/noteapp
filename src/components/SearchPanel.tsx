import { useCallback, useEffect, useRef, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { listVoid, purgeNote, purgeVoid, restoreNote, searchNotes, type Note, type VoidNote } from "../lib/db";
import { exportNote } from "../lib/export";
import { CloseIcon, SearchIcon, TrashIcon } from "./icons";

interface SearchPanelProps {
  current: Note | null;
  onClose: () => void;
  onOpenNote: (id: string) => void;
  onNoteRestored: () => void;
}

type Mode = "search" | "void";

function firstLine(content: string): string {
  const line = content.split("\n").find((l) => l.trim().length > 0);
  return line?.trim() ?? "(empty note)";
}

function preview(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function SearchPanel({ current, onClose, onOpenNote, onNoteRestored }: SearchPanelProps) {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [voidNotes, setVoidNotes] = useState<VoidNote[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }
    const found = await searchNotes(value.trim());
    setResults(found);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void runSearch(query), 120);
    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  const loadVoid = useCallback(async () => {
    const notes = await listVoid();
    setVoidNotes(notes);
  }, []);

  useEffect(() => {
    if (mode === "void") {
      void loadVoid();
    }
  }, [mode, loadVoid]);

  const callbacks = {
    copy: async () => {
      if (!current) return;
      await writeText(current.content);
      onClose();
    },
    exportTxt: async () => {
      if (!current) return;
      await exportNote(current.content, "txt");
      onClose();
    },
    exportMd: async () => {
      if (!current) return;
      await exportNote(current.content, "md");
      onClose();
    },
    openVoid: () => setMode("void"),
  };

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ background: "var(--bg)" }}
      role="dialog"
      aria-label={mode === "search" ? "Search notes" : "The Void"}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <button type="button" className="chrome-button" aria-label="Close search" onClick={onClose}>
          <CloseIcon />
        </button>
        {mode === "search" ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search every note"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--ink-dim)]"
            style={{ color: "var(--ink)", caretColor: "var(--accent)" }}
            aria-label="Search query"
          />
        ) : (
          <div className="flex w-full items-center justify-between">
            <span className="text-[13px]" style={{ color: "var(--ink-dim)" }}>
              The Void
            </span>
            <button
              type="button"
              className="text-[11px] underline decoration-[var(--ink-faint)] underline-offset-2"
              style={{ color: "var(--ink-faint)" }}
              onClick={async () => {
                await purgeVoid();
                await loadVoid();
                onNoteRestored();
              }}
            >
              empty the void
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 h-px shrink-0" style={{ background: "var(--line-soft)" }} />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {mode === "search" ? (
          query.trim() === "" ? (
            <p className="px-2 py-6 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
              Type to search across all notes.
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
              No notes match "{query.trim()}".
            </p>
          ) : (
            results.map((note) => (
              <button
                key={note.id}
                type="button"
                className="block w-full rounded-[8px] px-2 py-2 text-left transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                onClick={() => {
                  onOpenNote(note.id);
                  onClose();
                }}
              >
                <span className="block truncate text-[12.5px]" style={{ color: "var(--ink)" }}>
                  {firstLine(note.content)}
                </span>
                <span className="block truncate text-[11px]" style={{ color: "var(--ink-faint)" }}>
                  {preview(note.content)}
                </span>
              </button>
            ))
          )
        ) : voidNotes.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
            The Void is empty. Deleted notes rest here.
          </p>
        ) : (
          voidNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-2 rounded-[8px] px-2 py-2 hover:bg-[var(--bg-raised)]"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px]" style={{ color: "var(--ink)" }}>
                  {firstLine(note.content)}
                </span>
                <span className="block truncate text-[11px]" style={{ color: "var(--ink-faint)" }}>
                  {preview(note.content) || "no text"}
                </span>
              </div>
              <button
                type="button"
                className="chrome-button"
                title="Restore note"
                aria-label="Restore note"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await restoreNote(note.id);
                  await loadVoid();
                  onNoteRestored();
                  setBusy(false);
                }}
              >
                <SearchIcon size={14} />
              </button>
              <button
                type="button"
                className="chrome-button"
                title="Delete forever"
                aria-label="Delete forever"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await purgeNote(note.id);
                  await loadVoid();
                  setBusy(false);
                }}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div
        className="flex shrink-0 items-center gap-1 border-t px-3 py-2"
        style={{ borderColor: "var(--line-soft)" }}
      >
        <button type="button" className="panel-action" onClick={() => void callbacks.copy()}>
          copy
        </button>
        <button type="button" className="panel-action" onClick={() => void callbacks.exportTxt()}>
          export .txt
        </button>
        <button type="button" className="panel-action" onClick={() => void callbacks.exportMd()}>
          export .md
        </button>
        <div className="flex-1" />
        {mode === "search" ? (
          <button type="button" className="panel-action" onClick={callbacks.openVoid}>
            the void
          </button>
        ) : (
          <button type="button" className="panel-action" onClick={() => setMode("search")}>
            back to search
          </button>
        )}
      </div>
    </div>
  );
}
