# app/api/lib/passkeyDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `94cf1aea4726c7623bc53c7c3d0c54605101487fe6dd79756bcdd452a5b70521`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## makeUserHandle

```ts
export function makeUserHandle(userId: string, school: string): string;
```

## PasskeyUserDoc

```ts
export interface PasskeyUserDoc {
  encryptedRefreshToken: string;
  encryptedRefreshTokenIV: string;
  school: string;
  orgId: string;
  username: string;
  userId?: string;
  lastTokenUpdate: Timestamp;
}
```

## PasskeyCredential

```ts
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
```

## PasskeyChallenge

```ts
export interface PasskeyChallenge {
  challenge: string;
  type: 'registration' | 'authentication';
  userHandle: string;
  createdAt: Timestamp;
}
```

## getPasskeyUser

```ts
export async function getPasskeyUser(userHandle: string): Promise<PasskeyUserDoc | null>;
```

## upsertPasskeyUser

```ts
export async function upsertPasskeyUser(
  userHandle: string,
  data: {
    encryptedRefreshToken: string;
    encryptedRefreshTokenIV: string;
    school: string;
    orgId: string;
    username: string;
    userId: string;
  }
): Promise<void>;
```

## updatePasskeyToken

```ts
export async function updatePasskeyToken(
  userHandle: string,
  encryptedRefreshToken: string,
  encryptedRefreshTokenIV: string
): Promise<void>;
```

## getCredential

```ts
export async function getCredential(
  userHandle: string,
  credentialId: string
): Promise<PasskeyCredential | null>;
```

## findCredentialByIdGlobal

```ts
export async function findCredentialByIdGlobal(
  credentialId: string
): Promise<{ userHandle: string; credential: PasskeyCredential } | null>;
```

## saveCredential

```ts
export async function saveCredential(userHandle: string, cred: PasskeyCredential): Promise<void>;
```

## updateCredentialSignCount

```ts
export async function updateCredentialSignCount(
  userHandle: string,
  credentialId: string,
  signCount: number
): Promise<void>;
```

## listCredentials

```ts
export async function listCredentials(userHandle: string): Promise<PasskeyCredential[]>;
```

## deleteCredential

```ts
export async function deleteCredential(userHandle: string, credentialId: string): Promise<void>;
```

## countCredentials

```ts
export async function countCredentials(userHandle: string): Promise<number>;
```

## saveChallenge

```ts
export async function saveChallenge(
  challengeId: string,
  challenge: string,
  type: 'registration' | 'authentication',
  userHandle: string
): Promise<void>;
```

## consumeChallenge

```ts
export async function consumeChallenge(challengeId: string): Promise<PasskeyChallenge | null>;
```
