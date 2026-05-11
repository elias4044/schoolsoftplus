/**
 * Server-side AES-GCM-256 encrypt / decrypt.
 *
 * Used exclusively to protect SchoolSoft refresh tokens at rest in Firestore.
 * The key is read from PASSKEY_ENCRYPTION_KEY (64-hex chars = 32 bytes).
 * Every encryption call generates a fresh 96-bit random IV; the IV must be
 * stored alongside the ciphertext and provided to decrypt().
 */

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96 bits — recommended for AES-GCM
const TAG_BYTES = 16;

function getKey(): Buffer {
  const hex = process.env.PASSKEY_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("PASSKEY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedValue {
  ciphertext: string; // base64
  iv: string;         // base64
}

/**
 * Encrypts `plaintext` with AES-256-GCM.
 * Returns base64-encoded ciphertext (with 16-byte auth tag appended) and IV.
 */
export function encrypt(plaintext: string): EncryptedValue {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store auth tag appended to ciphertext so a single field holds both
  const combined = Buffer.concat([encrypted, tag]);
  return {
    ciphertext: combined.toString("base64"),
    iv: iv.toString("base64"),
  };
}

/**
 * Decrypts a value produced by `encrypt()`.
 * Returns the plaintext, or throws if the key/IV/ciphertext is wrong (auth tag mismatch).
 */
export function decrypt({ ciphertext, iv }: EncryptedValue): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");
  const ivBuf = Buffer.from(iv, "base64");
  // Last 16 bytes are the auth tag
  const tag = combined.subarray(combined.length - TAG_BYTES);
  const data = combined.subarray(0, combined.length - TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGO, key, ivBuf);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
