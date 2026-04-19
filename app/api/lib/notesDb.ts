import { db } from "./firebaseAdmin";
import crypto from "crypto";

export type NoteStatus = "draft" | "published" | "archived";

export interface Note {
  id: string;
  username: string;
  title: string;
  content: string; // markdown
  status: NoteStatus;
  shareToken: string | null;
  createdAt: number; // unix ms
  updatedAt: number;
}

// Public-safe shape (no username)
export type NotePublic = Omit<Note, "username">;

const COL = "notes_v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToNote(doc: FirebaseFirestore.DocumentSnapshot<any>): Note {
  const d = doc.data()!;
  return {
    id: doc.id,
    username: d.username ?? "",
    title: d.title ?? "Untitled",
    content: d.content ?? "",
    status: d.status ?? "draft",
    shareToken: d.shareToken ?? null,
    createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

export async function getNotesByUser(username: string): Promise<Note[]> {
  const snap = await db
    .collection(COL)
    .where("username", "==", username)
    .get();
  return snap.docs
    .map(docToNote)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNoteById(id: string, username: string): Promise<Note | null> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  const note = docToNote(doc);
  if (note.username !== username) return null;
  return note;
}

export async function getNoteByShareToken(token: string): Promise<Note | null> {
  const snap = await db
    .collection(COL)
    .where("shareToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return docToNote(snap.docs[0]);
}

export async function createNote(
  username: string,
  title: string,
  content: string,
  status: NoteStatus = "draft"
): Promise<Note> {
  const now = Date.now();
  const ref = db.collection(COL).doc();
  const data = { username, title, content, status, shareToken: null, createdAt: now, updatedAt: now };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function updateNote(
  id: string,
  username: string,
  updates: Partial<Pick<Note, "title" | "content" | "status">>
): Promise<Note | null> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const existing = docToNote(doc);
  if (existing.username !== username) return null;
  const patch = { ...updates, updatedAt: Date.now() };
  await ref.update(patch);
  return { ...existing, ...patch };
}

export async function deleteNote(id: string, username: string): Promise<boolean> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  if (docToNote(doc).username !== username) return false;
  await ref.delete();
  return true;
}

export async function generateShareToken(id: string, username: string): Promise<string | null> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  if (docToNote(doc).username !== username) return null;
  const token = crypto.randomBytes(20).toString("hex");
  await ref.update({ shareToken: token });
  return token;
}

export async function revokeShareToken(id: string, username: string): Promise<boolean> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  if (docToNote(doc).username !== username) return false;
  await ref.update({ shareToken: null });
  return true;
}
