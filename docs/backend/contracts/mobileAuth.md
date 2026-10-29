# app/api/lib/mobileAuth.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `65322b9c8e1bf7d11469ae1d3681be2e5e7e91acd33653c1c40500f6199941a1`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## MobileTokenPayload

```ts
export interface MobileTokenPayload {
  /** SchoolSoft username (lower-cased) */
  username: string;
  /** School slug, e.g. "engelska" */
  school: string;
  /** SchoolSoft Bearer access token (from their OAuth token endpoint) */
  ssToken: string;
  /** SchoolSoft refresh token \u2014 present when the token endpoint returns one */
  refreshToken?: string;
  /** Unix timestamp (seconds) when the SchoolSoft access token expires */
  ssTokenExpiresAt?: number;
  /** SchoolSoft numeric user ID */
  userId?: number;
  iat: number;
  exp: number;
}
```

## signMobileToken

```ts
export function signMobileToken(
  payload: Omit<MobileTokenPayload, 'iat' | 'exp'>,
  expiresInDays = 30
): string;
```

## verifyMobileToken

```ts
export function verifyMobileToken(token: string): MobileTokenPayload | null;
```

## extractBearerToken

```ts
export function extractBearerToken(authHeader: string | null): string | null;
```

## makePkcePair

```ts
export function makePkcePair(): { verifier: string; challenge: string };
```

## makeState

```ts
export function makeState(): string;
```

## SchoolsoftAccountInfo

```ts
export interface SchoolsoftAccountInfo {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  userId: number;
}
```

## fetchSchoolsoftSession

```ts
export async function fetchSchoolsoftSession(
  school: string,
  accessToken: string,
  orgId = '18'
): Promise<SchoolsoftAccountInfo | null>;
```

## exchangeCodeForToken

```ts
export async function exchangeCodeForToken(
  school: string,
  code: string,
  verifier: string
): Promise<Record<string, unknown> | null>;
```
