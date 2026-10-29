# app/api/lib/groupInvitesDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/groupInvitesDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `c33a747a86698381a9ff30a104e74230c059bd20d636289be669a676a83d2d63`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## GroupInviteStatus

```ts
export type GroupInviteStatus = 'pending' | 'accepted' | 'declined';
```

## GroupInvite

```ts
export interface GroupInvite {
  id: string;
  conversationId: string;
  groupName: string;
  invitedUserId: string;
  invitedById: string;
  invitedByDisplayName: string;
  status: GroupInviteStatus;
  invitedAt: number;
  updatedAt: number;
}
```

## getPendingInvitesForUser

```ts
export async function getPendingInvitesForUser(username: string): Promise<GroupInvite[]>;
```

## getInviteById

```ts
export async function getInviteById(id: string): Promise<GroupInvite | null>;
```

## sendGroupInvite

```ts
export async function sendGroupInvite(
  conversationId: string,
  invitedUserId: string,
  invitedById: string
): Promise<GroupInvite | null>;
```

## respondToGroupInvite

```ts
export async function respondToGroupInvite(
  inviteId: string,
  responder: string,
  accept: boolean
): Promise<{ invite: GroupInvite; joined: boolean }>;
```
