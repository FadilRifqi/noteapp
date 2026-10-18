import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export function cleanPastedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/^[ \t]+/, "")
        .replace(/^[-*•+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/[ \t]+$/, ""),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export async function exportNote(content: string, format: "txt" | "md"): Promise<boolean> {
  const path = await save({
    title: "Export note",
    defaultPath: `archnote-note.${format}`,
    filters: [{ name: format === "md" ? "Markdown" : "Plain text", extensions: [format] }],
  });
  if (!path) return false;
  const body = format === "md" ? content : content;
  await invoke("write_text_file", { path, contents: `${body}\n` });
  return true;
}
