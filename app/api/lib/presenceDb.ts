import { db } from "./firebaseAdmin";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type UserStatus = "online" | "idle" | "offline";

export interface PresenceRecord {
  username: string;
  status: UserStatus;
  lastSeen: number;
  updatedAt: number;
}

/* ─────────────────────────────────────────────────────────────
   Collection
───────────────────────────────────────────────────────────── */

const COL = "presence_v1";

/* ─────────────────────────────────────────────────────────────
   Status thresholds (ms)
───────────────────────────────────────────────────────────── */

const ONLINE_THRESHOLD = 3 * 60 * 1000;   // 3 minutes → online (green)
const IDLE_THRESHOLD   = 15 * 60 * 1000;  // 15 minutes → idle/in-app (yellow)

/** Derive a display status from a stored record (accounts for stale heartbeats). */
export function computeStatus(record: PresenceRecord | null): UserStatus {
  if (!record) return "offline";
  const age = Date.now() - record.lastSeen;
  if (age < ONLINE_THRESHOLD) return "online";
  if (age < IDLE_THRESHOLD)   return "idle";
  return "offline";
}

/* ─────────────────────────────────────────────────────────────
   Writes (called server-side via API routes)
───────────────────────────────────────────────────────────── */

export async function updatePresence(username: string, status: UserStatus): Promise<void> {
  const now = Date.now();
  await db.collection(COL).doc(username).set(
    { status, lastSeen: now, updatedAt: now },
    { merge: true }
  );
}

/* ─────────────────────────────────────────────────────────────
   Reads
───────────────────────────────────────────────────────────── */

export async function getPresence(username: string): Promise<PresenceRecord | null> {
  const doc = await db.collection(COL).doc(username).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    username,
    status:    d.status    ?? "offline",
    lastSeen:  d.lastSeen  ?? 0,
    updatedAt: d.updatedAt ?? 0,
  };
}

export async function getPresenceForUsers(usernames: string[]): Promise<Record<string, PresenceRecord>> {
  if (!usernames.length) return {};
  const results: Record<string, PresenceRecord> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < usernames.length; i += 10) chunks.push(usernames.slice(i, i + 10));
  for (const chunk of chunks) {
    const refs = chunk.map(u => db.collection(COL).doc(u));
    const docs = await db.getAll(...refs);
    for (const doc of docs) {
      if (doc.exists) {
        const d = doc.data()!;
        results[doc.id] = {
          username:  doc.id,
          status:    d.status    ?? "offline",
          lastSeen:  d.lastSeen  ?? 0,
          updatedAt: d.updatedAt ?? 0,
        };
      }
    }
  }
  return results;
}
