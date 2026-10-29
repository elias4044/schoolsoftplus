import crypto from 'crypto';
/**
 * Mobile authentication helpers.
 *
 * JWT signing / verification uses HS256 with MOBILE_JWT_SECRET.
 * PKCE helpers for the SchoolSoft OAuth 2.0 + PKCE flow.
 */

import axios from 'axios';

import { assertSchool, normalizeUserId } from './identity';

/* ─────────────────────────────────────────────────────────────
   Base64url helpers
───────────────────────────────────────────────────────────── */

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input as string, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): string {
  // Pad to a multiple of 4 before decoding
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
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
  if (!s) throw new Error('MOBILE_JWT_SECRET env var is not set.');
  return s;
}

/**
 * Signs a mobile JWT valid for `expiresInDays` days (default 30).
 */
export function signMobileToken(
  payload: Omit<MobileTokenPayload, 'iat' | 'exp'>,
  expiresInDays = 30
): string {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const full: MobileTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 86400,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(full));
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

/**
 * Verifies a mobile JWT and returns its payload, or `null` if invalid / expired.
 */
export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    const expectedSig = b64url(
      crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
    );
    const actualSignature = Buffer.from(sig);
    const expectedSignature = Buffer.from(expectedSig);
    if (
      actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)
    )
      return null;
    if (JSON.parse(b64urlDecode(header)).alg !== 'HS256') return null;

    const payload = JSON.parse(b64urlDecode(body)) as MobileTokenPayload;
    if (
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      typeof payload.username !== 'string' ||
      typeof payload.school !== 'string' ||
      typeof payload.ssToken !== 'string'
    )
      return null;
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
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

/** Generates a random opaque state string. */
export function makeState(): string {
  return crypto.randomBytes(12).toString('hex');
}

/* ─────────────────────────────────────────────────────────────
   SchoolSoft session helper
───────────────────────────────────────────────────────────── */

export interface SchoolsoftAccountInfo {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  userId: number;
}

export async function fetchSchoolsoftSession(
  school: string,
  accessToken: string,
  orgId = '18'
): Promise<SchoolsoftAccountInfo | null> {
  assertSchool(school);
  const sessionUrl = `https://sms.schoolsoft.se/${school}/rest-api/session`;
  const options = {
    timeout: 5_000,
    maxRedirects: 0,
    validateStatus: () => true,
    responseType: 'json' as const,
  };
  try {
    // The REST session endpoint authenticates with browser cookies, not the OAuth token.
    const exchange = await axios.get(
      `https://sms.schoolsoft.se/${school}/eva-apps/auth/login/student`,
      {
        ...options,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          token: accessToken,
          orgid: orgId,
          'User-Agent': 'nyEva',
          'X-Requested-With': 'com.schoolsoft.eapp.android',
          redirecturl: `https://sms.schoolsoft.se/${school}/react/#/student/subjectrooms`,
          language: 'sw',
          theme: 'dark',
          useros: 'android',
        },
      }
    );
    const setCookie = exchange.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const cookiePairs = cookies.map((value: string) => value.split(';')[0].trim());
    if (!cookiePairs.some((pair: string) => /^JSESSIONID=.+$/.test(pair))) return null;
    const response = await axios.get(sessionUrl, {
      ...options,
      headers: { Cookie: cookiePairs.join('; '), Accept: 'application/json' },
    });
    const data = response.data;
    const userId = normalizeUserId(data?.user?.id);
    if (
      response.status !== 200 ||
      !userId ||
      typeof data.user.userName !== 'string' ||
      !data.user.userName.trim()
    )
      return null;
    return {
      username: data.user.userName.toLowerCase().trim(),
      firstName: data.user.firstName ?? '',
      lastName: data.user.lastName ?? '',
      email: data.user.email ?? '',
      schoolName: data.organization?.name ?? '',
      userType: data.userType?.name ?? '',
      userId: Number(userId),
    };
  } catch {
    return null;
  }
}

/**
 * Shared helper — POST to SchoolSoft's token endpoint.
 * Returns the raw SchoolSoft token fields or null on failure.
 */
export async function exchangeCodeForToken(
  school: string,
  code: string,
  verifier: string
): Promise<Record<string, unknown> | null> {
  const CLIENT_ID = 'eApp';
  const tokenUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/token` +
    `?clientId=${encodeURIComponent(CLIENT_ID)}` +
    `&grantType=code` +
    `&code=${encodeURIComponent(code)}` +
    `&codeVerifier=${encodeURIComponent(verifier)}`;

  try {
    const tokenRes = await fetch(tokenUrl, {
      signal: AbortSignal.timeout(8_000),
      method: 'POST',
      headers: { accept: 'application/json' },
    });

    const text = await tokenRes.text();

    if (tokenRes.status !== 200) {
      console.warn(`[mobile] token exchange status ${tokenRes.status}`);
      return null;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      // Bare token string — wrap it
      return text ? { access_token: text } : null;
    }
  } catch (err) {
    console.error('[mobile] token exchange error:', (err as Error).message);
    return null;
  }
}
