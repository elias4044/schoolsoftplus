/**
 * Mobile authentication helpers.
 *
 * JWT signing / verification uses HS256 with MOBILE_JWT_SECRET.
 * PKCE helpers for the SchoolSoft OAuth 2.0 + PKCE flow.
 */

import crypto from "crypto";
import axios from "axios";

/* ─────────────────────────────────────────────────────────────
   Base64url helpers
───────────────────────────────────────────────────────────── */

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input as string, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  // Pad to a multiple of 4 before decoding
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

/* ─────────────────────────────────────────────────────────────
   JWT (HS256)
───────────────────────────────────────────────────────────── */

export interface MobileTokenPayload {
  /** SchoolSoft username (lower-cased) */
  username: string;
  /** School slug, e.g. "engelska" */
  school: string;
  /** SchoolSoft Bearer access token (from their OAuth token endpoint) */
  ssToken: string;
  /** SchoolSoft refresh token — present when the token endpoint returns one */
  refreshToken?: string;
  /** Unix timestamp (seconds) when the SchoolSoft access token expires */
  ssTokenExpiresAt?: number;
  /** SchoolSoft numeric user ID */
  userId?: number;
  iat: number;
  exp: number;
}

function getJwtSecret(): string {
  const s = process.env.MOBILE_JWT_SECRET;
  if (!s) throw new Error("MOBILE_JWT_SECRET env var is not set.");
  return s;
}

/**
 * Signs a mobile JWT valid for `expiresInDays` days (default 30).
 */
export function signMobileToken(
  payload: Omit<MobileTokenPayload, "iat" | "exp">,
  expiresInDays = 30
): string {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const full: MobileTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 86400,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = b64url(JSON.stringify(full));
  const sig    = b64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

/**
 * Verifies a mobile JWT and returns its payload, or `null` if invalid / expired.
 */
export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    const expectedSig = b64url(
      crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
    );
    if (sig !== expectedSig) return null;

    const payload = JSON.parse(b64urlDecode(body)) as MobileTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts the Bearer token from an Authorization header.
 * Returns null if missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/* ─────────────────────────────────────────────────────────────
   PKCE
───────────────────────────────────────────────────────────── */

/**
 * Generates a PKCE verifier + SHA-256 challenge pair (base64url-encoded).
 */
export function makePkcePair(): { verifier: string; challenge: string } {
  const verifier  = b64url(crypto.randomBytes(32));
  const challenge = b64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

/** Generates a random opaque state string. */
export function makeState(): string {
  return crypto.randomBytes(12).toString("hex");
}

/* ─────────────────────────────────────────────────────────────
   SchoolSoft session helper
───────────────────────────────────────────────────────────── */

/**
 * Calls SchoolSoft's /rest-api/session endpoint using a Bearer access token
 * to retrieve the authenticated user's info (username, school, etc.).
 * Returns null if the token is invalid or the request fails.
 */
export async function fetchSchoolsoftSession(
  school: string,
  accessToken: string
): Promise<{
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  userId: number | undefined;
} | null> {
  try {
    const res = await axios.get(
      `https://sms.schoolsoft.se/${school}/rest-api/session`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "User-Agent": "SchoolSoftPlus-Mobile/1.0",
        },
        validateStatus: () => true,
        responseType: "json",
      }
    );
    if (res.status !== 200) return null;
    const d = res.data ?? {};
    return {
      username:   (d.user?.userName   ?? "").toLowerCase(),
      firstName:  d.user?.firstName   ?? "",
      lastName:   d.user?.lastName    ?? "",
      email:      d.user?.email       ?? "",
      schoolName: d.organization?.name ?? "",
      userType:   d.userType?.name    ?? "",
      userId:     typeof d.user?.id === "number" ? d.user.id : undefined,
    };
  } catch {
    return null;
  }
}
