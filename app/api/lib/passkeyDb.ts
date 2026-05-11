/**
 * Firestore CRUD helpers for passkey data.
 *
 * Collections:
 *   passkey_users/{userHandle}
 *     encryptedRefreshToken  string  (base64)
 *     encryptedRefreshTokenIV string  (base64)
 *     school                 string
 *     orgId                  string
 *     username               string
 *     lastTokenUpdate        Timestamp
 *
 *   passkey_users/{userHandle}/credentials/{credentialId}
 *     credentialId  string   base64url
 *     publicKey     string   base64url COSE key
 *     signCount     number
 *     deviceName    string
 *     createdAt     Timestamp
 *     lastUsedAt    Timestamp
 *     deviceType    string
 *     backedUp      boolean
 *
 *   passkey_challenges/{challengeId}
 *     challenge    string   base64url
 *     type         "registration" | "authentication"
 *     userHandle   string
 *     createdAt    Timestamp
 *
 * userHandle = base64url(username@school) — both lowercase.
 */

import { db } from "./firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ─────────────────────────────────────────────────────────────
   userHandle helpers
───────────────────────────────────────────────────────────── */

export function makeUserHandle(username: string, school: string): string {
  const raw = `${username.toLowerCase()}@${school.toLowerCase()}`;
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export interface PasskeyUserDoc {
  encryptedRefreshToken: string;
  encryptedRefreshTokenIV: string;
  school: string;
  orgId: string;
  username: string;
  lastTokenUpdate: Timestamp;
}

export interface PasskeyCredential {
  credentialId: string;
  publicKey: string;
  signCount: number;
  deviceName: string;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
  deviceType: string;
  backedUp: boolean;
}

export interface PasskeyChallenge {
  challenge: string;
  type: "registration" | "authentication";
  userHandle: string;
  createdAt: Timestamp;
}

/* ─────────────────────────────────────────────────────────────
   passkey_users
───────────────────────────────────────────────────────────── */

export async function getPasskeyUser(userHandle: string): Promise<PasskeyUserDoc | null> {
  const doc = await db.collection("passkey_users").doc(userHandle).get();
  if (!doc.exists) return null;
  return doc.data() as PasskeyUserDoc;
}

export async function upsertPasskeyUser(
  userHandle: string,
  data: {
    encryptedRefreshToken: string;
    encryptedRefreshTokenIV: string;
    school: string;
    orgId: string;
    username: string;
  }
): Promise<void> {
  await db.collection("passkey_users").doc(userHandle).set(
    { ...data, lastTokenUpdate: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function updatePasskeyToken(
  userHandle: string,
  encryptedRefreshToken: string,
  encryptedRefreshTokenIV: string
): Promise<void> {
  await db.collection("passkey_users").doc(userHandle).update({
    encryptedRefreshToken,
    encryptedRefreshTokenIV,
    lastTokenUpdate: FieldValue.serverTimestamp(),
  });
}

/* ─────────────────────────────────────────────────────────────
   passkey_users/{userHandle}/credentials
───────────────────────────────────────────────────────────── */

export async function getCredential(
  userHandle: string,
  credentialId: string
): Promise<PasskeyCredential | null> {
  const doc = await db
    .collection("passkey_users")
    .doc(userHandle)
    .collection("credentials")
    .doc(credentialId)
    .get();
  if (!doc.exists) return null;
  return doc.data() as PasskeyCredential;
}

/**
 * Finds the userHandle that owns a given credentialId.
 * Uses a flat index doc to avoid a collection-group query (no Firestore index required).
 */
export async function findCredentialByIdGlobal(
  credentialId: string
): Promise<{ userHandle: string; credential: PasskeyCredential } | null> {
  const indexDoc = await db.collection("passkey_credential_index").doc(credentialId).get();
  if (!indexDoc.exists) return null;
  const { userHandle } = indexDoc.data() as { userHandle: string };
  const credential = await getCredential(userHandle, credentialId);
  if (!credential) return null;
  return { userHandle, credential };
}

export async function saveCredential(
  userHandle: string,
  cred: PasskeyCredential
): Promise<void> {
  const batch = db.batch();
  batch.set(
    db.collection("passkey_users").doc(userHandle).collection("credentials").doc(cred.credentialId),
    cred
  );
  // Flat index: credentialId -> userHandle (no collection-group query needed)
  batch.set(
    db.collection("passkey_credential_index").doc(cred.credentialId),
    { userHandle }
  );
  await batch.commit();
}

export async function updateCredentialSignCount(
  userHandle: string,
  credentialId: string,
  signCount: number
): Promise<void> {
  await db
    .collection("passkey_users")
    .doc(userHandle)
    .collection("credentials")
    .doc(credentialId)
    .update({ signCount, lastUsedAt: FieldValue.serverTimestamp() });
}

export async function listCredentials(userHandle: string): Promise<PasskeyCredential[]> {
  const snap = await db
    .collection("passkey_users")
    .doc(userHandle)
    .collection("credentials")
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(d => d.data() as PasskeyCredential);
}

export async function deleteCredential(
  userHandle: string,
  credentialId: string
): Promise<void> {
  const batch = db.batch();
  batch.delete(
    db.collection("passkey_users").doc(userHandle).collection("credentials").doc(credentialId)
  );
  batch.delete(
    db.collection("passkey_credential_index").doc(credentialId)
  );
  await batch.commit();
}

/** Returns the number of credentials for a user. */
export async function countCredentials(userHandle: string): Promise<number> {
  const snap = await db
    .collection("passkey_users")
    .doc(userHandle)
    .collection("credentials")
    .count()
    .get();
  return snap.data().count;
}

/* ─────────────────────────────────────────────────────────────
   passkey_challenges
───────────────────────────────────────────────────────────── */

export async function saveChallenge(
  challengeId: string,
  challenge: string,
  type: "registration" | "authentication",
  userHandle: string
): Promise<void> {
  await db.collection("passkey_challenges").doc(challengeId).set({
    challenge,
    type,
    userHandle,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Retrieves and validates a challenge.
 * Returns null if not found or older than CHALLENGE_TTL_MS.
 * Always deletes the challenge document (single-use).
 */
export async function consumeChallenge(
  challengeId: string
): Promise<PasskeyChallenge | null> {
  const ref = db.collection("passkey_challenges").doc(challengeId);
  const doc = await ref.get();
  // Always delete — even on failure, so stale docs don't accumulate
  await ref.delete().catch(() => {});
  if (!doc.exists) return null;
  const data = doc.data() as PasskeyChallenge & { createdAt: Timestamp };
  const ageMs = Date.now() - data.createdAt.toMillis();
  if (ageMs > CHALLENGE_TTL_MS) return null;
  return data;
}
