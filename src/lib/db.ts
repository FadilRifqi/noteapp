import Database from "@tauri-apps/plugin-sql";

export interface Note {
  id: string;
  content: string;
  created_at: number;
  updated_at: number;
  pinned: number;
}

export interface VoidNote extends Note {
  deleted_at: number;
}

const DB_URL = "sqlite:archnote.db";

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    "SELECT id, content, created_at, updated_at, pinned FROM notes WHERE deleted_at IS NULL ORDER BY created_at ASC",
  );
}

export async function createNote(content = ""): Promise<Note> {
  const db = await getDb();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO notes (id, content, created_at, updated_at) VALUES ($1, $2, $3, $4)",
    [id, content, now, now],
  );
  return { id, content, created_at: now, updated_at: now, pinned: 0 };
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<Note[]>(
    "SELECT id, content, created_at, updated_at, pinned FROM notes WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  return rows[0] ?? null;
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE notes SET pinned = $1 WHERE id = $2", [pinned ? 1 : 0, id]);
}

export async function saveNote(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE notes SET content = $1, updated_at = $2 WHERE id = $3", [
    content,
    Date.now(),
    id,
  ]);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE notes SET deleted_at = $1 WHERE id = $2", [Date.now(), id]);
}

export async function searchNotes(query: string): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    "SELECT id, content, created_at, updated_at, pinned FROM notes WHERE deleted_at IS NULL AND content LIKE '%' || $1 || '%' ORDER BY created_at DESC",
    [query],
  );
}

export async function listVoid(): Promise<VoidNote[]> {
  const db = await getDb();
  return db.select<VoidNote[]>(
    "SELECT id, content, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
  );
}

export async function restoreNote(id: string): Promise<Note | null> {
  const db = await getDb();
  await db.execute("UPDATE notes SET deleted_at = NULL WHERE id = $1", [id]);
  const rows = await db.select<Note[]>(
    "SELECT id, content, created_at, updated_at, pinned FROM notes WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function purgeNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1 AND deleted_at IS NOT NULL", [id]);
}

export async function purgeVoid(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE deleted_at IS NOT NULL");
}
