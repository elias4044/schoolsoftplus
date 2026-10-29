import { randomBytes } from 'crypto';

import { resolveAccountReference } from './accountRegistry';
import { db } from './firebaseAdmin';
import { normalizeUserId } from './identity';

export interface ReferredUserEntry {
  userId: string;
  joinedAt: number;
}

export interface ReferralData {
  code: string;
  totalReferrals: number;
  referredUsers: ReferredUserEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  userId: string;
  totalReferrals: number;
  rank: number;
}

const COL = 'referrals_v1';
const CODES_COL = 'referral_codes_v1';

// Unambiguous alphanumeric characters (no 0/O, 1/I/l)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join('');
}

export async function getOrCreateReferralCode(userId: string): Promise<ReferralData> {
  const ref = db.collection(COL).doc(userId);
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const codeRef = db.collection(CODES_COL).doc(code);
    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      const reservation = await transaction.get(codeRef);
      if (existing.exists) return existing.data() as ReferralData;
      if (reservation.exists) return null;
      const now = Date.now();
      const data: ReferralData = {
        code,
        totalReferrals: 0,
        referredUsers: [],
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(ref, { ...data, userId });
      transaction.set(codeRef, { userId, createdAt: now });
      return data;
    });
    if (result) return (await getReferralData(userId))!;
  }
  throw new Error('Could not reserve a referral code');
}

export async function getReferralData(userId: string): Promise<ReferralData | null> {
  const doc = await db.collection(COL).doc(userId.toLowerCase()).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    code: d.code,
    totalReferrals: d.totalReferrals ?? 0,
    referredUsers: await Promise.all(
      (d.referredUsers ?? []).map(async (entry: ReferredUserEntry & { username?: string }) => ({
        userId: await resolveAccountReference(entry.userId ?? entry.username ?? ''),
        joinedAt: entry.joinedAt,
      }))
    ),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/**
 * Look up the userId that owns a given referral code.
 * Returns null for invalid or non-existent codes.
 */
export async function getUserIdByCode(code: string): Promise<string | null> {
  if (!code || !/^[A-Z0-9]{6,12}$/.test(code.toUpperCase())) return null;
  const doc = await db.collection(CODES_COL).doc(code.toUpperCase()).get();
  if (!doc.exists) return null;
  const owner = doc.data()!.userId ?? doc.data()!.username;
  return typeof owner === 'string' ? resolveAccountReference(owner) : null;
}

/**
 * Credit a successful referral.
 * Returns true when the referral was newly counted, false if it was already
 * tracked or if the referrer doc doesn't exist.
 */
export async function creditReferral(
  referrerUsername: string,
  newUsername: string
): Promise<boolean> {
  const lower = await resolveAccountReference(referrerUsername);
  const newLower = await resolveAccountReference(newUsername);
  return db.runTransaction(async (tx) => {
    let ownerId = lower;
    let legacyNames: string[];
    if (normalizeUserId(lower)) {
      const aliases = await tx.get(db.collection('account_aliases').where('userId', '==', lower));
      legacyNames = aliases.docs.map((alias) => alias.id);
    } else {
      const alias = await tx.get(db.collection('account_aliases').doc(lower));
      ownerId = alias.data()?.userId ?? lower;
      legacyNames = [lower];
    }
    if (ownerId === newLower) return false;
    let doc = await tx.get(db.collection(COL).doc(ownerId));
    for (const name of legacyNames) {
      if (doc.exists) break;
      doc = await tx.get(db.collection(COL).doc(name));
    }
    if (!doc.exists) return false;

    const d = doc.data()!;
    const existing: ReferredUserEntry[] = await Promise.all(
      (d.referredUsers ?? []).map(async (entry: ReferredUserEntry & { username?: string }) => ({
        userId: await resolveAccountReference(entry.userId ?? entry.username ?? ''),
        joinedAt: entry.joinedAt,
      }))
    );

    // Idempotency guard: never count the same referred user twice
    if (existing.some((u) => u.userId === newLower)) return false;

    const updated = [...existing, { userId: newLower, joinedAt: Date.now() }];
    tx.update(doc.ref, {
      totalReferrals: (d.totalReferrals ?? 0) + 1,
      referredUsers: updated,
      updatedAt: Date.now(),
    });
    return true;
  });
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const snap = await db
    .collection(COL)
    .where('totalReferrals', '>', 0)
    .orderBy('totalReferrals', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc, i) => ({
    userId: doc.id,
    totalReferrals: (doc.data().totalReferrals ?? 0) as number,
    rank: i + 1,
  }));
}
