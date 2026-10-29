# app/api/auth/v2/lib.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/lib.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `c6d43e5dd0a9b0eaa740e2f04e5a95ca0c9d9d3497c6aa8f089e3576e77f509a`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## AuthV2Error

```ts
export class AuthV2Error extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AuthV2Error';
    this.status = status;
  }
}
```

## AuthV2SessionData

```ts
export interface AuthV2SessionData {
  school: string;
  orgid: string;
  username: string;
  userId: string;
  ssToken: string;
  refreshToken: string;
  ssTokenExpiresAt: number;
  jsessionid: string;
  hash: string;
  usertype: string;
}
```

## refreshAuthV2Session

```ts
export async function refreshAuthV2Session({
  school,
  refreshToken,
  orgid = '18',
  usernameHint = '',
  requireBrowserSession = false,
}: {
  school: string;
  refreshToken: string;
  orgid?: string;
  usernameHint?: string;
  requireBrowserSession?: boolean;
}): Promise<AuthV2SessionData>;
```

## applyAuthV2Cookies

```ts
export function applyAuthV2Cookies(res: NextResponse, session: AuthV2SessionData);
```

## syncPasskeyRefreshToken

```ts
export async function syncPasskeyRefreshToken(
  userId: string,
  school: string,
  refreshToken: string
);
```
