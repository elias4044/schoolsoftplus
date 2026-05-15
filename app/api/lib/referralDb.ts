import { db } from "./firebaseAdmin";
import { randomBytes } from "crypto";

export interface ReferredUserEntry {
  username: string;
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
  username: string;
  totalReferrals: number;
  rank: number;
}

const COL = "referrals_v1";
const CODES_COL = "referral_codes_v1";

// Unambiguous alphanumeric characters (no 0/O, 1/I/l)
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

export async function getOrCreateReferralCode(username: string): Promise<ReferralData> {
  const lower = username.toLowerCase();
  const docRef = db.collection(COL).doc(lower);
  const doc = await docRef.get();

  if (doc.exists) {
    const d = doc.data()!;
    return {
      code: d.code,
      totalReferrals: d.totalReferrals ?? 0,
      referredUsers: d.referredUsers ?? [],
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  // Generate a collision-free code (up to 10 attempts)
  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode();
    const existing = await db.collection(CODES_COL).doc(candidate).get();
    if (!existing.exists) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Could not generate unique referral code");

  const now = Date.now();
  const data: ReferralData = {
    code,
    totalReferrals: 0,
    referredUsers: [],
    createdAt: now,
    updatedAt: now,
  };

  // Write both the referral doc and the reverse-lookup code doc atomically
  const batch = db.batch();
  batch.set(docRef, data);
  batch.set(db.collection(CODES_COL).doc(code), { username: lower, createdAt: now });
  await batch.commit();

  return data;
}

export async function getReferralData(username: string): Promise<ReferralData | null> {
  const doc = await db.collection(COL).doc(username.toLowerCase()).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    code: d.code,
    totalReferrals: d.totalReferrals ?? 0,
    referredUsers: d.referredUsers ?? [],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/**
 * Look up the username that owns a given referral code.
 * Returns null for invalid or non-existent codes.
 */
export async function getUsernameByCode(code: string): Promise<string | null> {
  if (!code || !/^[A-Z0-9]{6,12}$/.test(code.toUpperCase())) return null;
  const doc = await db.collection(CODES_COL).doc(code.toUpperCase()).get();
  if (!doc.exists) return null;
  return (doc.data()!.username as string) ?? null;
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
  const lower = referrerUsername.toLowerCase();
  const newLower = newUsername.toLowerCase();
  const docRef = db.collection(COL).doc(lower);

  try {
    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) return false;

      const d = doc.data()!;
      const existing: ReferredUserEntry[] = d.referredUsers ?? [];

      // Idempotency guard: never count the same referred user twice
      if (existing.some((u) => u.username === newLower)) return false;

      const updated = [...existing, { username: newLower, joinedAt: Date.now() }];
      tx.update(docRef, {
        totalReferrals: (d.totalReferrals ?? 0) + 1,
        referredUsers: updated,
        updatedAt: Date.now(),
      });
      return true;
    });
  } catch {
    return false;
  }
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const snap = await db
    .collection(COL)
    .where("totalReferrals", ">", 0)
    .orderBy("totalReferrals", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc, i) => ({
    username: doc.id,
    totalReferrals: (doc.data().totalReferrals ?? 0) as number,
    rank: i + 1,
  }));
}
