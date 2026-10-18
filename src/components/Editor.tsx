import { forwardRef, useEffect, type ClipboardEvent } from "react";
import { motion } from "framer-motion";
import { cleanPastedText } from "../lib/export";

interface EditorProps {
  noteId: string;
  content: string;
  direction: 1 | -1;
  onChange: (content: string) => void;
}

export const Editor = forwardRef<HTMLTextAreaElement, EditorProps>(function Editor(
  { noteId, content, direction, onChange },
  ref,
) {
  useEffect(() => {
    if (ref && "current" in ref && ref.current) {
      ref.current.focus();
      const length = ref.current.value.length;
      ref.current.setSelectionRange(length, length);
    }
  }, [noteId, ref]);

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const raw = event.clipboardData.getData("text/plain");
    if (!raw) return;
    const cleaned = cleanPastedText(raw);
    if (cleaned === raw) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.focus();
    const inserted = document.execCommand("insertText", false, cleaned);
    if (!inserted) {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = target.value.slice(0, start) + cleaned + target.value.slice(end);
      onChange(next);
      queueMicrotask(() => {
        target.setSelectionRange(start + cleaned.length, start + cleaned.length);
      });
    }
  };

  return (
    <motion.div
      key={noteId}
      initial={{ x: direction * 26, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -26, opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-0 flex-1"
    >
      <textarea
        ref={ref}
        className="editor"
        value={content}
        placeholder="Start typing. This note is temporary."
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onChange={(event) => onChange(event.target.value)}
        onPaste={onPaste}
        aria-label="Note text"
      />
    </motion.div>
  );
});
