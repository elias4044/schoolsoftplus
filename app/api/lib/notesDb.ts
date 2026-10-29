import crypto from 'crypto';

import { db } from './firebaseAdmin';

export type NoteStatus = 'draft' | 'published' | 'archived';

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string; // markdown
  status: NoteStatus;
  shareToken: string | null;
  createdAt: number; // unix ms
  updatedAt: number;
}

export type NotePublic = Omit<Note, 'userId' | 'shareToken'>;

const COL = 'notes_v2';

function docToNote(doc: FirebaseFirestore.DocumentSnapshot): Note {
  const data = doc.data()!;
  return {
    id: doc.id,
    userId: data.userId ?? '',
    title: data.title ?? 'Untitled',
    content: data.content ?? '',
    status: data.status ?? 'draft',
    shareToken: data.shareToken ?? null,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

export async function getNotesByUser(userId: string): Promise<Note[]> {
  const snap = await db.collection(COL).where('userId', '==', userId).get();
  return snap.docs.map(docToNote).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNoteById(id: string, userId: string): Promise<Note | null> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  const note = docToNote(doc);
  if (note.userId !== userId) return null;
  return note;
}

export async function getNoteByShareToken(token: string): Promise<Note | null> {
  const snap = await db.collection(COL).where('shareToken', '==', token).limit(1).get();
  if (snap.empty) return null;
  return docToNote(snap.docs[0]);
}

export async function createNote(
  userId: string,
  title: string,
  content: string,
  status: NoteStatus = 'draft'
): Promise<Note> {
  const now = Date.now();
  const ref = db.collection(COL).doc();
  const data = {
    userId,
    title,
    content,
    status,
    shareToken: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function updateNote(
  id: string,
  userId: string,
  updates: Partial<Pick<Note, 'title' | 'content' | 'status'>>
): Promise<Note | null> {
  const ref = db.collection(COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;
    const existing = docToNote(doc);
    if (existing.userId !== userId) return null;
    if (Object.entries(updates).every(([key, value]) => existing[key as keyof Note] === value))
      return existing;
    const patch = { ...updates, updatedAt: Date.now() };
    transaction.update(ref, patch);
    return { ...existing, ...patch };
  });
}

export async function deleteNote(id: string, userId: string): Promise<boolean> {
  const ref = db.collection(COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return false;
    if (docToNote(doc).userId !== userId) return false;
    transaction.delete(ref);
    return true;
  });
}

export async function generateShareToken(id: string, userId: string): Promise<string | null> {
  const ref = db.collection(COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;
    if (docToNote(doc).userId !== userId) return null;
    const token = crypto.randomBytes(20).toString('hex');
    transaction.update(ref, { shareToken: token });
    return token;
  });
}

export async function revokeShareToken(id: string, userId: string): Promise<boolean> {
  const ref = db.collection(COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return false;
    if (docToNote(doc).userId !== userId) return false;
    if (docToNote(doc).shareToken !== null) transaction.update(ref, { shareToken: null });
    return true;
  });
}
