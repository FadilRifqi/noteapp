import { useCallback, useEffect, useRef, useState } from "react";
import { createNote, deleteNote, listNotes, saveNote, type Note } from "../lib/db";

const SAVE_DEBOUNCE_MS = 250;

let ensureNotesPromise: Promise<Note[]> | null = null;

function ensureNotes(): Promise<Note[]> {
  if (!ensureNotesPromise) {
    ensureNotesPromise = (async () => {
      const notes = await listNotes();
      if (notes.length > 0) return notes;
      return [await createNote()];
    })().catch((error) => {
      ensureNotesPromise = null;
      throw error;
    });
  }
  return ensureNotesPromise;
}

export interface NotesState {
  notes: Note[];
  index: number;
  loading: boolean;
  error: string | null;
}

export function useNotes() {
  const [state, setState] = useState<NotesState>({
    notes: [],
    index: 0,
    loading: true,
    error: null,
  });
  const pendingSave = useRef<{ id: string; content: string; timer: number } | null>(null);

  const flushSave = useCallback(() => {
    const pending = pendingSave.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingSave.current = null;
    void saveNote(pending.id, pending.content).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const notes = await ensureNotes();
        if (cancelled) return;
        setState({ notes, index: notes.length - 1, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => flushSave();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flushSave]);

  const updateContent = useCallback((content: string) => {
    setState((s) => {
      const current = s.notes[s.index];
      if (!current) return s;
      const notes = s.notes.slice();
      notes[s.index] = { ...current, content, updated_at: Date.now() };
      const pending = pendingSave.current;
      if (pending && pending.id === current.id) {
        window.clearTimeout(pending.timer);
      }
      const timer = window.setTimeout(() => {
        pendingSave.current = null;
        void saveNote(current.id, content).catch(() => undefined);
      }, SAVE_DEBOUNCE_MS);
      pendingSave.current = { id: current.id, content, timer };
      return { ...s, notes };
    });
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setState((s) => {
        if (target < 0 || target >= s.notes.length || target === s.index) return s;
        flushSave();
        return { ...s, index: target };
      });
    },
    [flushSave],
  );

  const newNote = useCallback(async () => {
    try {
      flushSave();
      const note = await createNote();
      setState((s) => ({ ...s, notes: [...s.notes, note], index: s.notes.length }));
      return note.id;
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  }, [flushSave]);

  const goNext = useCallback(() => {
    setState((s) => {
      if (s.index < s.notes.length - 1) {
        flushSave();
        return { ...s, index: s.index + 1 };
      }
      return s;
    });
  }, [flushSave]);

  const goPrev = useCallback(() => {
    setState((s) => {
      if (s.index > 0) {
        flushSave();
        return { ...s, index: s.index - 1 };
      }
      return s;
    });
  }, [flushSave]);

  const deleteCurrent = useCallback(async (): Promise<Note | null> => {
    flushSave();
    const current = state.notes[state.index];
    if (!current) return null;
    try {
      await deleteNote(current.id);
      let remaining = state.notes.filter((n) => n.id !== current.id);
      if (remaining.length === 0) {
        remaining = [await createNote()];
      }
      const nextIndex = Math.min(state.index, remaining.length - 1);
      setState({ ...state, notes: remaining, index: nextIndex });
      return current;
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  }, [flushSave, state]);

  const applyPinned = useCallback((id: string, pinned: boolean) => {
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: pinned ? 1 : 0 } : n)),
    }));
  }, []);

  const applyContent = useCallback((id: string, content: string) => {
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) => (n.id === id && n.content !== content ? { ...n, content } : n)),
    }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      let notes = await listNotes();
      if (notes.length === 0) notes = [await createNote()];
      setState((s) => ({
        ...s,
        notes,
        index: Math.min(s.index, notes.length - 1),
        loading: false,
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  const jumpToId = useCallback(
    (id: string) => {
      setState((s) => {
        const target = s.notes.findIndex((n) => n.id === id);
        if (target === -1) return s;
        flushSave();
        return { ...s, index: target };
      });
    },
    [flushSave],
  );

  return {
    ...state,
    refresh,
    jumpToId,
    applyPinned,
    applyContent,
    current: state.notes[state.index] ?? null,
    updateContent,
    goTo,
    goNext,
    goPrev,
    newNote,
    deleteCurrent,
  };
}
