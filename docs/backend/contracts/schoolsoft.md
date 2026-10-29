# app/api/lib/schoolsoft.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `bb4261d97c6b0309061bfd09e67b7e16549b5c55e5ce0cd419ef9d0097ef5d9e`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## createSchoolsoftClient

```ts
export function createSchoolsoftClient(school: string);
```

## getSchool

```ts
export function getSchool(req: NextRequest | Headers): string;
```

## getSessionCookies

```ts
export function getSessionCookies(req: NextRequest): {
  cookieString: string;
  school: string;
  username: string;
  userid: string;
  orgid: string;
  token: string;
} | null;
```

## decodeHtmlResponse

```ts
export function decodeHtmlResponse(buffer: Buffer | ArrayBuffer): string;
```

## applySessionCookieUpdates

```ts
export function applySessionCookieUpdates(
  res: import('next/server').NextResponse,
  cookieUpdates: {
    jsessionid: string;
    hash: string;
    usertype: string;

    username?: string;
    userid?: string;
    orgid?: string;

    ssToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  } | null
);
```

## VerifiedSessionData

```ts
export interface VerifiedSessionData {
  user: { id: number; userName: string; firstName?: string; lastName?: string; email?: string };
  organization?: { id: number; name?: string };
  userType?: { id: number; name?: string };
  [key: string]: unknown;
}
```

## VerifiedSession

```ts
export type VerifiedSession = ResolvedSession & {
  userId: string;
  sessionData: VerifiedSessionData;
};
```

## requireSession

```ts
export function requireSession(req: NextRequest): Promise<VerifiedSession | null>;
```

## getRequestSession

```ts
export function getRequestSession(request: Request): Promise<VerifiedSession | null> | undefined;
```
