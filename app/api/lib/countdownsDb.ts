import { db } from "./firebaseAdmin";
import crypto from "crypto";

/* ---------------------------------------------------------- */
/*  Types                                                       */
/* ---------------------------------------------------------- */

export type CountdownCategory =
  | "exam"
  | "holiday"
  | "birthday"
  | "event"
  | "deadline"
  | "custom";

export type CountdownTheme =
  | "violet"
  | "rose"
  | "amber"
  | "emerald"
  | "sky"
  | "slate";

export interface Countdown {
  id: string;
  username: string;
  title: string;
  description: string;
  targetDate: number;   // unix ms
  category: CountdownCategory;
  theme: CountdownTheme;
  emoji: string;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CountdownPublic = Omit<Countdown, "username">;

const COL = "countdowns_v1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToCountdown(doc: FirebaseFirestore.DocumentSnapshot<any>): Countdown {
  const d = doc.data()!;
  return {
    id: doc.id,
    username: d.username ?? "",
    title: d.title ?? "Untitled",
    description: d.description ?? "",
    targetDate: typeof d.targetDate === "number" ? d.targetDate : Date.now(),
    category: d.category ?? "custom",
    theme: d.theme ?? "violet",
    emoji: d.emoji ?? "⏳",
    pinned: d.pinned ?? false,
    archived: d.archived ?? false,
    createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

/* ---------------------------------------------------------- */
/*  CRUD                                                        */
/* ---------------------------------------------------------- */

export async function getCountdownsByUser(username: string): Promise<Countdown[]> {
  const snap = await db
    .collection(COL)
    .where("username", "==", username)
    .get();
  return snap.docs
    .map(docToCountdown)
    .sort((a, b) => a.targetDate - b.targetDate);
}

export async function getCountdownById(id: string, username: string): Promise<Countdown | null> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  const c = docToCountdown(doc);
  if (c.username !== username) return null;
  return c;
}

export async function createCountdown(
  username: string,
  fields: Omit<Countdown, "id" | "username" | "createdAt" | "updatedAt">
): Promise<Countdown> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const data = {
    username,
    ...fields,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(COL).doc(id).set(data);
  return { id, ...data };
}

export async function updateCountdown(
  id: string,
  username: string,
  patch: Partial<Omit<Countdown, "id" | "username" | "createdAt">>
): Promise<Countdown | null> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  const existing = docToCountdown(doc);
  if (existing.username !== username) return null;

  const updated = { ...patch, updatedAt: Date.now() };
  await db.collection(COL).doc(id).update(updated);
  return { ...existing, ...updated };
}

export async function deleteCountdown(id: string, username: string): Promise<boolean> {
  const doc = await db.collection(COL).doc(id).get();
  if (!doc.exists) return false;
  if (docToCountdown(doc).username !== username) return false;
  await db.collection(COL).doc(id).delete();
  return true;
}
