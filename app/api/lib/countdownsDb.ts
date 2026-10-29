import crypto from 'crypto';

import { db } from './firebaseAdmin';

export type CountdownCategory = 'exam' | 'holiday' | 'birthday' | 'event' | 'deadline' | 'custom';

export type CountdownTheme = 'violet' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';

export interface Countdown {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: number; // unix ms
  category: CountdownCategory;
  theme: CountdownTheme;
  emoji: string;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CountdownPublic = Omit<Countdown, 'userId'>;

const COL = 'countdowns_v1';

function docToCountdown(doc: FirebaseFirestore.DocumentSnapshot): Countdown {
  const data = doc.data()!;
  return {
    id: doc.id,
    userId: data.userId ?? '',
    title: data.title ?? 'Untitled',
    description: data.description ?? '',
    targetDate: typeof data.targetDate === 'number' ? data.targetDate : Date.now(),
    category: data.category ?? 'custom',
    theme: data.theme ?? 'violet',
    emoji: data.emoji ?? '\u23f3',
    pinned: data.pinned ?? false,
    archived: data.archived ?? false,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

export async function getCountdownsByUser(userId: string): Promise<Countdown[]> {
  const snap = await db.collection(COL).where('userId', '==', userId).get();
  return snap.docs.map(docToCountdown).sort((a, b) => a.targetDate - b.targetDate);
}

export async function getCountdownById(id: string, userId: string): Promise<Countdown | null> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  const c = docToCountdown(doc);
  if (c.userId !== userId) return null;
  return c;
}

export async function createCountdown(
  userId: string,
  fields: Omit<Countdown, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Countdown> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const data = {
    userId,
    ...fields,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(COL).doc(id).set(data);
  return { id, ...data };
}

export async function updateCountdown(
  id: string,
  userId: string,
  patch: Partial<Omit<Countdown, 'id' | 'userId' | 'createdAt'>>
): Promise<Countdown | null> {
  const ref = db.collection(COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;
    const existing = docToCountdown(doc);
    if (existing.userId !== userId) return null;

    if (Object.entries(patch).every(([key, value]) => existing[key as keyof Countdown] === value))
      return existing;
    const updated = { ...patch, updatedAt: Date.now() };
    transaction.update(ref, updated);
    return { ...existing, ...updated };
  });
}

export async function deleteCountdown(id: string, userId: string): Promise<boolean> {
  const ref = db.collection(COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return false;
    if (docToCountdown(doc).userId !== userId) return false;
    transaction.delete(ref);
    return true;
  });
}
