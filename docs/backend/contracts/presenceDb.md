# app/api/lib/presenceDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/presenceDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `c7dc871ffb5e14e157ede2ad29442ddb62d32a4b257f9e88da3c04eaf74b38ee`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## UserStatus

```ts
export type UserStatus = 'online' | 'idle' | 'offline';
```

## PresenceRecord

```ts
export interface PresenceRecord {
  userId: string;
  status: UserStatus;
  lastSeen: number;
  updatedAt: number;
}
```

## computeStatus

```ts
export function computeStatus(record: PresenceRecord | null): UserStatus;
```

## updatePresence

```ts
export async function updatePresence(userId: string, status: UserStatus): Promise<void>;
```

## getPresence

```ts
export async function getPresence(userId: string): Promise<PresenceRecord | null>;
```

## getPresenceForUsers

```ts
export async function getPresenceForUsers(
  userIds: string[]
): Promise<Record<string, PresenceRecord>>;
```
