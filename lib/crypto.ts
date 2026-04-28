/**
 * End-to-end encryption utilities for SchoolSoft+ encrypted group chats.
 *
 * Security design:
 *  - Password → PBKDF2 (SHA-256, 310 000 iterations) → 256-bit AES-GCM key
 *  - Salt is deterministic: UTF-8("schoolsoftplus-e2ee-<conversationId>")
 *    so every participant derives the same key from the same password + conversation.
 *  - Each message gets a fresh cryptographically-random 96-bit IV (12 bytes).
 *  - Wire format (base64): [12-byte IV][AES-GCM ciphertext+tag]
 *  - The password is NEVER sent to the server. Only the encrypted blob is stored.
 *  - Decryption failure (wrong password / corrupt data) returns null gracefully.
 */

const PBKDF2_ITERATIONS = 310_000;
const KEY_BITS = 256;

/** Derive a non-exportable AES-GCM key from a user password and conversation ID. */
export async function deriveKey(
  password: string,
  conversationId: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(`schoolsoftplus-e2ee-${conversationId}`),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext with an AES-GCM key.
 * Returns a base64 string: [12-byte IV][ciphertext+16-byte auth-tag]
 */
export async function encryptMessage(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(12 + ciphertextBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuf), 12);

  // btoa over binary string
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded ciphertext produced by encryptMessage.
 * Returns the plaintext string, or null if the password is wrong / data is corrupt.
 */
export async function decryptMessage(
  key: CryptoKey,
  encoded: string
): Promise<string | null> {
  try {
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    if (combined.length < 13) return null; // too short to be valid

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plainBuf);
  } catch {
    return null; // wrong password or corrupted data
  }
}
