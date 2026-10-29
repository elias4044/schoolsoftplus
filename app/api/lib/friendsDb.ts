import { assertCurrentAccountReferences } from './accountRegistry';
import { db } from './firebaseAdmin';
import { InputError } from './validation';

/* 
   Types
 */

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  userAId: string; // alphabetically first
  userBId: string; // alphabetically second
  requestedById: string; // who sent the request
  status: FriendshipStatus;
  createdAt: number;
  updatedAt: number;
}

/* 
   Collection
 */

const COL = 'friendships_v1';

/* 
   Helpers
 */

function canonical(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function docToFriendship(doc: FirebaseFirestore.DocumentSnapshot): Friendship {
  const d = doc.data()!;
  return {
    id: doc.id,
    userAId: d.userAId,
    userBId: d.userBId,
    requestedById: d.requestedById,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/* 
   Reads
 */

export async function getFriendship(a: string, b: string): Promise<Friendship | null> {
  const [firstId, secondId] = canonical(a, b);
  const doc = await db.collection(COL).doc(`${firstId}_${secondId}`).get();
  if (doc.exists) return docToFriendship(doc);
  const matches = await findExistingFriendship(a, b);
  return matches ? docToFriendship(matches) : null;
}

async function findExistingFriendship(
  a: string,
  b: string,
  transaction?: FirebaseFirestore.Transaction
) {
  for (const field of ['userAId', 'userBId']) {
    const query = db.collection(COL).where(field, '==', a);
    const matches = transaction ? await transaction.get(query) : await query.get();
    const match = matches.docs.find((doc) => {
      const data = doc.data();
      return (
        (data.userAId === a && data.userBId === b) || (data.userAId === b && data.userBId === a)
      );
    });
    if (match) return match;
  }
  return null;
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await getFriendship(a, b);
  return f?.status === 'accepted';
}

export async function getFriends(userId: string): Promise<Friendship[]> {
  const [asA, asB] = await Promise.all([
    db.collection(COL).where('userAId', '==', userId).where('status', '==', 'accepted').get(),
    db.collection(COL).where('userBId', '==', userId).where('status', '==', 'accepted').get(),
  ]);
  return [...asA.docs.map(docToFriendship), ...asB.docs.map(docToFriendship)];
}

export async function getPendingRequestsReceived(userId: string): Promise<Friendship[]> {
  // requests where I am the target (not the requester)
  const [asA, asB] = await Promise.all([
    db.collection(COL).where('userAId', '==', userId).where('status', '==', 'pending').get(),
    db.collection(COL).where('userBId', '==', userId).where('status', '==', 'pending').get(),
  ]);
  const all = [...asA.docs.map(docToFriendship), ...asB.docs.map(docToFriendship)];
  return all.filter((f) => f.requestedById !== userId);
}

export async function getPendingRequestsSent(userId: string): Promise<Friendship[]> {
  const snap = await db
    .collection(COL)
    .where('requestedById', '==', userId)
    .where('status', '==', 'pending')
    .get();
  return snap.docs.map(docToFriendship);
}

/* 
   Writes
 */

export async function sendFriendRequest(from: string, to: string): Promise<Friendship> {
  if (from === to) throw new InputError('Cannot send a friend request to yourself');
  const [userAId, userBId] = canonical(from, to);
  return db.runTransaction(async (transaction) => {
    await assertCurrentAccountReferences(transaction, [from, to]);
    const match = await findExistingFriendship(from, to, transaction);
    const ref = match?.ref ?? db.collection(COL).doc(`${userAId}_${userBId}`);
    const doc = await transaction.get(ref);
    const existing = doc.exists ? docToFriendship(doc) : null;
    if (existing?.status === 'accepted') throw new InputError('Already friends', 409);
    if (existing?.status === 'pending' && existing.requestedById === from) return existing;
    const now = Date.now();
    const data: Omit<Friendship, 'id'> = {
      userAId,
      userBId,
      requestedById: existing?.status === 'pending' ? existing.requestedById : from,
      status: existing?.status === 'pending' ? 'accepted' : 'pending',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    transaction.set(ref, data);
    return { id: ref.id, ...data };
  });
}

export async function respondToFriendRequest(
  responder: string,
  requesterUserId: string,
  accept: boolean
): Promise<Friendship | null> {
  const [firstId, secondId] = canonical(responder, requesterUserId);
  return db.runTransaction(async (transaction) => {
    const match = await findExistingFriendship(responder, requesterUserId, transaction);
    const ref = match?.ref ?? db.collection(COL).doc(`${firstId}_${secondId}`);
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;
    const existing = docToFriendship(doc);
    if (existing.status !== 'pending' || existing.requestedById !== requesterUserId) return null;
    const patch = {
      status: (accept ? 'accepted' : 'declined') as FriendshipStatus,
      updatedAt: Date.now(),
    };
    transaction.update(ref, patch);
    return { ...existing, ...patch };
  });
}

export async function removeFriend(a: string, b: string): Promise<boolean> {
  const friendship = await getFriendship(a, b);
  if (friendship) await db.collection(COL).doc(friendship.id).delete();
  return true;
}
