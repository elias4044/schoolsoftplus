# app/api/lib/messagingDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/messagingDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `ed708fead29d1f70b206da685678b9bb5de01c9745d8d00a29acb95ffb91ba0b`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## ReplyTo

```ts
export interface ReplyTo {
  messageId: string;
  content: string;
  senderDisplayName: string;
}
```

## NoteShareCard

```ts
export interface NoteShareCard {
  type: 'note';
  noteId: string;
  title: string;
  preview: string; // first 220 chars of stripped content
  fullContent?: string; // full raw markdown (stored at share time so recipient can read it)
  status: 'draft' | 'published' | 'archived';
  sharedAt: number;
}
```

## GradeShareCard

```ts
export interface GradeShareCard {
  type: 'grade';
  assignmentId: number;
  assignmentTitle: string;
  subjectName: string;
  assignmentType: string;
  grade: string;
  confidence: 'confirmed' | 'estimated';
  totalPoints: string | null; // e.g. "45 / 50"
  sharedAt: number;
}
```

## FlashDeckShareCard

```ts
export interface FlashDeckShareCard {
  type: 'flashdeck';
  deckId: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  cardCount: number;
  tags: string[];
  subjectName: string | null;
  sharedByUserId: string;
  sharedAt: number;
}
```

## ShareCard

```ts
export type ShareCard = NoteShareCard | GradeShareCard | FlashDeckShareCard;
```

## Message

```ts
export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDisplayName: string;
  content: string;
  edited: boolean;
  editedAt: number | null;
  pinned: boolean;
  deletedAt: number | null; // soft-delete
  createdAt: number;
  reactions: Record<string, string[]>; // emoji \u2192 list of usernames
  replyTo: ReplyTo | null;
  shareCard: ShareCard | null;
}
```

## Conversation

```ts
export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  participantIds: string[]; // usernames
  participantNames: Record<string, string>; // username \u2192 displayName
  participantPfpUrls: Record<string, string>; // username \u2192 pfp URL
  groupName: string | null; // null for DMs
  groupDescription: string | null;
  adminUserId: string | null; // null for DMs
  encrypted: boolean; // E2EE group
  lastMessage: string;
  lastSenderUserId: string;
  lastAt: number;
  createdAt: number;
  lastReadAt: Record<string, number>;
  participantAliases?: AccountAliases;
}
```

## getConversationsForUser

```ts
export async function getConversationsForUser(username: string): Promise<Conversation[]>;
```

## getConversation

```ts
export async function getConversation(id: string): Promise<Conversation | null>;
```

## findOrCreateDM

```ts
export async function findOrCreateDM(
  usernameA: string,
  displayNameA: string,
  usernameB: string,
  displayNameB: string,
  pfpUrlA = '',
  pfpUrlB = ''
): Promise<{ conversation: Conversation; created: boolean }>;
```

## updateParticipantName

```ts
export async function updateParticipantName(username: string, displayName: string);
```

## updateParticipantPfp

```ts
export async function updateParticipantPfp(username: string, pfpUrl: string);
```

## getMessages

```ts
export async function getMessages(conversationId: string, limit = 60): Promise<Message[]>;
```

## getReplyMessage

```ts
export async function getReplyMessage(
  messageId: string,
  conversationId: string
): Promise<Message | null>;
```

## getPinnedMessages

```ts
export async function getPinnedMessages(conversationId: string): Promise<Message[]>;
```

## createMessage

```ts
export async function createMessage(
  conversationId: string,
  senderUserId: string,
  senderDisplayName: string,
  content: string,
  replyTo?: ReplyTo | null,
  shareCard?: ShareCard | null
): Promise<Message>;
```

## editMessage

```ts
export function editMessage(
  messageId: string,
  conversationId: string,
  userId: string,
  content: string
);
```

## deleteMessage

```ts
export async function deleteMessage(
  messageId: string,
  conversationId: string,
  userId: string
): Promise<boolean>;
```

## setMessagePinned

```ts
export function setMessagePinned(
  messageId: string,
  conversationId: string,
  userId: string,
  pinned: boolean
);
```

## toggleReaction

```ts
export function toggleReaction(
  messageId: string,
  conversationId: string,
  userId: string,
  emoji: string
);
```

## UserSearchResult

```ts
export interface UserSearchResult {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  pfpUrl: string;
  pronouns: string;
  schoolName: string;
  userType: string;
}
```

## searchUsers

```ts
export async function searchUsers(
  query: string,
  excludeUsername: string
): Promise<UserSearchResult[]>;
```

## CreateGroupInput

```ts
export interface CreateGroupInput {
  creatorUserId: string;
  creatorDisplayName: string;
  creatorPfpUrl?: string;
  groupName: string;
  groupDescription?: string;
  encrypted?: boolean;
  members: { userId: string; displayName: string; pfpUrl?: string }[];
}
```

## createGroupChat

```ts
export async function createGroupChat(input: CreateGroupInput): Promise<Conversation>;
```

## updateGroupInfo

```ts
export function updateGroupInfo(
  conversationId: string,
  userId: string,
  patch: { groupName?: string; groupDescription?: string }
);
```

## addGroupMember

```ts
export function addGroupMember(
  conversationId: string,
  userId: string,
  newUserId: string,
  displayName: string
);
```

## removeGroupMember

```ts
export function removeGroupMember(conversationId: string, userId: string, targetId: string);
```

## markConversationRead

```ts
export async function markConversationRead(
  conversationId: string,
  username: string
): Promise<void>;
```

## transferGroupAdmin

```ts
export function transferGroupAdmin(conversationId: string, userId: string, newAdminId: string);
```
