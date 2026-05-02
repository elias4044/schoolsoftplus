import { db } from "./firebaseAdmin";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface Friendship {
  id: string;
  userA: string;       // alphabetically first
  userB: string;       // alphabetically second
  requestedBy: string; // who sent the request
  status: FriendshipStatus;
  createdAt: number;
  updatedAt: number;
}

/* ─────────────────────────────────────────────────────────────
   Collection
───────────────────────────────────────────────────────────── */

const COL = "friendships_v1";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function canonical(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToFriendship(doc: FirebaseFirestore.DocumentSnapshot<any>): Friendship {
  const d = doc.data()!;
  return {
    id:          doc.id,
    userA:       d.userA,
    userB:       d.userB,
    requestedBy: d.requestedBy,
    status:      d.status,
    createdAt:   d.createdAt,
    updatedAt:   d.updatedAt,
  };
}

/* ─────────────────────────────────────────────────────────────
   Reads
───────────────────────────────────────────────────────────── */

export async function getFriendship(a: string, b: string): Promise<Friendship | null> {
  const [u1, u2] = canonical(a, b);
  const snap = await db.collection(COL)
    .where("userA", "==", u1)
    .where("userB", "==", u2)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return docToFriendship(snap.docs[0]);
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await getFriendship(a, b);
  return f?.status === "accepted";
}

export async function getFriends(username: string): Promise<Friendship[]> {
  const [asA, asB] = await Promise.all([
    db.collection(COL).where("userA", "==", username).where("status", "==", "accepted").get(),
    db.collection(COL).where("userB", "==", username).where("status", "==", "accepted").get(),
  ]);
  return [
    ...asA.docs.map(docToFriendship),
    ...asB.docs.map(docToFriendship),
  ];
}

export async function getPendingRequestsReceived(username: string): Promise<Friendship[]> {
  // requests where I am the target (not the requester)
  const [asA, asB] = await Promise.all([
    db.collection(COL).where("userA", "==", username).where("status", "==", "pending").get(),
    db.collection(COL).where("userB", "==", username).where("status", "==", "pending").get(),
  ]);
  const all = [
    ...asA.docs.map(docToFriendship),
    ...asB.docs.map(docToFriendship),
  ];
  return all.filter(f => f.requestedBy !== username);
}

export async function getPendingRequestsSent(username: string): Promise<Friendship[]> {
  const snap = await db.collection(COL)
    .where("requestedBy", "==", username)
    .where("status", "==", "pending")
    .get();
  return snap.docs.map(docToFriendship);
}

/* ─────────────────────────────────────────────────────────────
   Writes
───────────────────────────────────────────────────────────── */

export async function sendFriendRequest(from: string, to: string): Promise<Friendship> {
  const existing = await getFriendship(from, to);
  const now = Date.now();

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("Already friends.");
    }
    if (existing.requestedBy === from && existing.status === "pending") {
      throw new Error("Request already sent.");
    }
    if (existing.status === "pending") {
      // They already sent us a request — auto-accept
      await db.collection(COL).doc(existing.id).update({ status: "accepted", updatedAt: now });
      return { ...existing, status: "accepted", updatedAt: now };
    }
    if (existing.status === "declined") {
      // Allow resend
      await db.collection(COL).doc(existing.id).update({ status: "pending", requestedBy: from, updatedAt: now });
      return { ...existing, status: "pending", requestedBy: from, updatedAt: now };
    }
  }

  const [userA, userB] = canonical(from, to);
  const ref = db.collection(COL).doc();
  const data = { userA, userB, requestedBy: from, status: "pending" as FriendshipStatus, createdAt: now, updatedAt: now };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function respondToFriendRequest(
  responder: string,
  requesterUsername: string,
  accept: boolean
): Promise<Friendship | null> {
  const friendship = await getFriendship(responder, requesterUsername);
  if (!friendship) return null;
  if (friendship.requestedBy !== requesterUsername) return null;
  if (friendship.status !== "pending") return null;

  const status: FriendshipStatus = accept ? "accepted" : "declined";
  const now = Date.now();
  await db.collection(COL).doc(friendship.id).update({ status, updatedAt: now });
  return { ...friendship, status, updatedAt: now };
}

export async function removeFriend(a: string, b: string): Promise<boolean> {
  const friendship = await getFriendship(a, b);
  if (!friendship) return false;
  await db.collection(COL).doc(friendship.id).delete();
  return true;
}
