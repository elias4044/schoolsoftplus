import { db } from './firebaseAdmin';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type UserStatus = 'online' | 'idle' | 'offline';

export interface PresenceRecord {
  userId: string;
  status: UserStatus;
  lastSeen: number;
  updatedAt: number;
}

/* ─────────────────────────────────────────────────────────────
   Collection
───────────────────────────────────────────────────────────── */

const COL = 'presence_v1';

/* ─────────────────────────────────────────────────────────────
   Status thresholds (ms)
───────────────────────────────────────────────────────────── */

const ONLINE_THRESHOLD = 3 * 60 * 1000; // 3 minutes → online (green)
const IDLE_THRESHOLD = 15 * 60 * 1000; // 15 minutes → idle/in-app (yellow)

/** Derive a display status from a stored record (accounts for stale heartbeats). */
export function computeStatus(record: PresenceRecord | null): UserStatus {
  if (!record) return 'offline';
  if (record.status === 'offline') return 'offline';
  const age = Date.now() - record.lastSeen;
  if (age < ONLINE_THRESHOLD) return record.status;
  if (age < IDLE_THRESHOLD) return 'idle';
  return 'offline';
}

/* ─────────────────────────────────────────────────────────────
   Writes (called server-side via API routes)
───────────────────────────────────────────────────────────── */

export async function updatePresence(userId: string, status: UserStatus): Promise<void> {
  const now = Date.now();
  const ref = db.collection(COL).doc(userId);
  await db.runTransaction(
    async (transaction) => {
      const snapshot = await transaction.get(ref);
      const previous = snapshot.data();
      const age = now - (previous?.updatedAt ?? 0);
      // Enforce this across tabs and server instances, including older clients.
      if (previous && (age < 15_000 || (previous.status === status && age < 110_000))) return;
      transaction.set(ref, { userId, status, lastSeen: now, updatedAt: now }, { merge: true });
    },
    { maxAttempts: 1 }
  );
}

/* ─────────────────────────────────────────────────────────────
   Reads
───────────────────────────────────────────────────────────── */

export async function getPresence(userId: string): Promise<PresenceRecord | null> {
  const doc = await db.collection(COL).doc(userId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    userId,
    status: d.status ?? 'offline',
    lastSeen: d.lastSeen ?? 0,
    updatedAt: d.updatedAt ?? 0,
  };
}

export async function getPresenceForUsers(
  userIds: string[]
): Promise<Record<string, PresenceRecord>> {
  if (!userIds.length) return {};
  const results: Record<string, PresenceRecord> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 10) chunks.push(userIds.slice(i, i + 10));
  for (const chunk of chunks) {
    const refs = chunk.map((u) => db.collection(COL).doc(u));
    const docs = await db.getAll(...refs);
    for (const doc of docs) {
      if (doc.exists) {
        const d = doc.data()!;
        results[doc.id] = {
          userId: doc.id,
          status: d.status ?? 'offline',
          lastSeen: d.lastSeen ?? 0,
          updatedAt: d.updatedAt ?? 0,
        };
      }
    }
  }
  return results;
}
