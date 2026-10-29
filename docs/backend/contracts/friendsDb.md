# app/api/lib/friendsDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/friendsDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `b16fd9968a51bb801b96dd85a468edd4263547e48b217677eab636c445f6c725`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## FriendshipStatus

```ts
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';
```

## Friendship

```ts
export interface Friendship {
  id: string;
  userAId: string; // alphabetically first
  userBId: string; // alphabetically second
  requestedById: string; // who sent the request
  status: FriendshipStatus;
  createdAt: number;
  updatedAt: number;
}
```

## getFriendship

```ts
export async function getFriendship(a: string, b: string): Promise<Friendship | null>;
```

## areFriends

```ts
export async function areFriends(a: string, b: string): Promise<boolean>;
```

## getFriends

```ts
export async function getFriends(userId: string): Promise<Friendship[]>;
```

## getPendingRequestsReceived

```ts
export async function getPendingRequestsReceived(userId: string): Promise<Friendship[]>;
```

## getPendingRequestsSent

```ts
export async function getPendingRequestsSent(userId: string): Promise<Friendship[]>;
```

## sendFriendRequest

```ts
export async function sendFriendRequest(from: string, to: string): Promise<Friendship>;
```

## respondToFriendRequest

```ts
export async function respondToFriendRequest(
  responder: string,
  requesterUserId: string,
  accept: boolean
): Promise<Friendship | null>;
```

## removeFriend

```ts
export async function removeFriend(a: string, b: string): Promise<boolean>;
```
