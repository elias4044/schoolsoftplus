import { FieldPath } from 'firebase-admin/firestore';

import { normalizeMessageIdentity, type AccountAliases } from '@/lib/accountReferences';

import { assertCurrentAccountReferences } from './accountRegistry';
import { db } from './firebaseAdmin';
import { InputError } from './validation';

/* 
   Types
 */

export interface ReplyTo {
  messageId: string;
  content: string;
  senderDisplayName: string;
}

/* 
   Share cards — generated server-side, never trusted from client
 */

export interface NoteShareCard {
  type: 'note';
  noteId: string;
  title: string;
  preview: string; // first 220 chars of stripped content
  fullContent?: string; // full raw markdown (stored at share time so recipient can read it)
  status: 'draft' | 'published' | 'archived';
  sharedAt: number;
}

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

export type ShareCard = NoteShareCard | GradeShareCard | FlashDeckShareCard;

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
  reactions: Record<string, string[]>; // emoji → list of usernames
  replyTo: ReplyTo | null;
  shareCard: ShareCard | null;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  participantIds: string[]; // usernames
  participantNames: Record<string, string>; // username → displayName
  participantPfpUrls: Record<string, string>; // username → pfp URL
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

/* 
   Collections
 */

const CONV_COL = 'conversations_v1';
const MSG_COL = 'messages_v1';
const PROF_COL = 'profiles_v1';

/* 
   Helpers
 */

function docToConversation(doc: FirebaseFirestore.DocumentSnapshot): Conversation {
  const d = doc.data()!;
  return {
    id: doc.id,
    type: (d.type === 'group' ? 'group' : 'dm') as 'dm' | 'group',
    participantIds: d.participantIds ?? [],
    participantAliases: d.participantAliases ?? {},
    participantNames: d.participantNames ?? {},
    participantPfpUrls: d.participantPfpUrls ?? {},
    groupName: d.groupName ?? null,
    groupDescription: d.groupDescription ?? null,
    adminUserId: d.adminUserId ?? null,
    encrypted: d.encrypted ?? false,
    lastMessage: d.lastMessage ?? '',
    lastSenderUserId: d.lastSenderUserId ?? '',
    lastAt: typeof d.lastAt === 'number' ? d.lastAt : 0,
    lastReadAt: d.lastReadAt ?? {},
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  };
}

function docToMessage(
  doc: FirebaseFirestore.DocumentSnapshot,
  aliases: AccountAliases = {}
): Message {
  const d = normalizeMessageIdentity(doc.data()!, aliases);
  return {
    id: doc.id,
    conversationId: d.conversationId ?? '',
    senderUserId: d.senderUserId ?? '',
    senderDisplayName: d.senderDisplayName ?? '',
    content: d.content ?? '',
    edited: d.edited ?? false,
    editedAt: d.editedAt ?? null,
    pinned: d.pinned ?? false,
    deletedAt: d.deletedAt ?? null,
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    reactions: d.reactions ?? {},
    replyTo: d.replyTo ?? null,
    shareCard: (d.shareCard as ShareCard | null) ?? null,
  };
}

/* 
   Conversations
 */

export async function getConversationsForUser(username: string): Promise<Conversation[]> {
  const snap = await db
    .collection(CONV_COL)
    .where('participantIds', 'array-contains', username)
    .orderBy('lastAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(docToConversation);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const doc = await db.collection(CONV_COL).doc(id).get();
  if (!doc.exists) return null;
  return docToConversation(doc);
}

/** Find an existing DM between two users or create one. */
export async function findOrCreateDM(
  usernameA: string,
  displayNameA: string,
  usernameB: string,
  displayNameB: string,
  pfpUrlA = '',
  pfpUrlB = ''
): Promise<{ conversation: Conversation; created: boolean }> {
  const participantIds = [usernameA, usernameB].sort();
  const query = db
    .collection(CONV_COL)
    .where('participantIds', '==', participantIds)
    .where('type', '==', 'dm')
    .limit(1);
  const ref = db.collection(CONV_COL).doc(`dm-${participantIds.join('-')}`);
  return db.runTransaction(async (transaction) => {
    await assertCurrentAccountReferences(transaction, participantIds);
    const matches = await transaction.get(query);
    if (!matches.empty) return { conversation: docToConversation(matches.docs[0]), created: false };
    const existing = await transaction.get(ref);
    if (existing.exists) return { conversation: docToConversation(existing), created: false };
    const now = Date.now();
    const data = {
      type: 'dm' as const,
      participantIds,
      participantNames: { [usernameA]: displayNameA, [usernameB]: displayNameB },
      participantPfpUrls: { [usernameA]: pfpUrlA, [usernameB]: pfpUrlB },
      groupName: null,
      groupDescription: null,
      adminUserId: null,
      encrypted: false,
      lastReadAt: {},
      lastMessage: '',
      lastSenderUserId: '',
      lastAt: now,
      createdAt: now,
    };
    transaction.set(ref, data);
    return { conversation: { id: ref.id, ...data }, created: true };
  });
}

/* Update participant display name snapshot if the user edits their profile */
export async function updateParticipantName(username: string, displayName: string) {
  const snap = await db
    .collection(CONV_COL)
    .where('participantIds', 'array-contains', username)
    .get();
  for (let offset = 0; offset < snap.docs.length; offset += 400) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(offset, offset + 400))
      batch.update(doc.ref, { [`participantNames.${username}`]: displayName });
    await batch.commit();
  }
}

/* Update participant pfp URL snapshot if the user changes their avatar */
export async function updateParticipantPfp(username: string, pfpUrl: string) {
  const snap = await db
    .collection(CONV_COL)
    .where('participantIds', 'array-contains', username)
    .get();
  for (let offset = 0; offset < snap.docs.length; offset += 400) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(offset, offset + 400))
      batch.update(doc.ref, { [`participantPfpUrls.${username}`]: pfpUrl });
    await batch.commit();
  }
}

/* 
   Messages
 */

export async function getMessages(conversationId: string, limit = 60): Promise<Message[]> {
  const aliases = (await getConversation(conversationId))?.participantAliases ?? {};
  const snap = await db
    .collection(MSG_COL)
    .where('conversationId', '==', conversationId)
    .orderBy('createdAt', 'asc')
    .limitToLast(limit)
    .get();
  return snap.docs.map((doc) => docToMessage(doc, aliases));
}

export async function getReplyMessage(
  messageId: string,
  conversationId: string
): Promise<Message | null> {
  const document = await db.collection(MSG_COL).doc(messageId).get();
  if (!document.exists) return null;
  const aliases = (await getConversation(conversationId))?.participantAliases ?? {};
  const message = docToMessage(document, aliases);
  return message.conversationId === conversationId && message.deletedAt === null ? message : null;
}

export async function getPinnedMessages(conversationId: string): Promise<Message[]> {
  const aliases = (await getConversation(conversationId))?.participantAliases ?? {};
  const snap = await db
    .collection(MSG_COL)
    .where('conversationId', '==', conversationId)
    .where('pinned', '==', true)
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((doc) => docToMessage(doc, aliases)).filter((m) => m.deletedAt === null);
}

export async function createMessage(
  conversationId: string,
  senderUserId: string,
  senderDisplayName: string,
  content: string,
  replyTo?: ReplyTo | null,
  shareCard?: ShareCard | null
): Promise<Message> {
  const now = Date.now();
  const ref = db.collection(MSG_COL).doc();
  const data = {
    conversationId,
    senderUserId,
    senderDisplayName,
    content,
    edited: false,
    editedAt: null,
    pinned: false,
    deletedAt: null,
    createdAt: now,
    reactions: {},
    replyTo: replyTo ?? null,
    shareCard: shareCard ?? null,
  };
  const conversationRef = db.collection(CONV_COL).doc(conversationId);
  await db.runTransaction(async (transaction) => {
    const conversation = (await transaction.get(conversationRef)).data();
    if (!conversation?.participantIds?.includes(senderUserId))
      throw new InputError('Conversation not found', 404);
    transaction.set(ref, data);
    transaction.update(conversationRef, {
      lastMessage: shareCard
        ? shareCard.type === 'note'
          ? 'Shared a note'
          : shareCard.type === 'flashdeck'
            ? 'Shared a flashcard deck'
            : 'Shared a grade'
        : content.slice(0, 120),
      lastSenderUserId: senderUserId,
      lastAt: now,
    });
  });

  return { id: ref.id, ...data };
}

async function mutateMessage(
  messageId: string,
  conversationId: string,
  userId: string,
  mutate: (message: Message, conversation: Conversation) => Partial<Message> | null
): Promise<Message | null> {
  const ref = db.collection(MSG_COL).doc(messageId);
  const conversationRef = db.collection(CONV_COL).doc(conversationId);
  return db.runTransaction(async (transaction) => {
    const messageDoc = await transaction.get(ref);
    const conversationDoc = await transaction.get(conversationRef);
    if (!messageDoc.exists || !conversationDoc.exists) return null;
    const conversation = docToConversation(conversationDoc);
    const message = docToMessage(messageDoc, conversation.participantAliases);
    if (
      message.conversationId !== conversationId ||
      message.deletedAt !== null ||
      !conversation.participantIds.includes(userId)
    )
      return null;
    const patch = mutate(message, conversation);
    if (!patch) return null;
    transaction.update(ref, {
      ...patch,
      senderUserId: message.senderUserId,
      reactions: patch.reactions ?? message.reactions,
    });
    return { ...message, ...patch };
  });
}

export function editMessage(
  messageId: string,
  conversationId: string,
  userId: string,
  content: string
) {
  return mutateMessage(messageId, conversationId, userId, (message) =>
    message.senderUserId === userId ? { content, edited: true, editedAt: Date.now() } : null
  );
}

export async function deleteMessage(
  messageId: string,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const message = await mutateMessage(messageId, conversationId, userId, (message, conversation) =>
    message.senderUserId === userId || conversation.adminUserId === userId
      ? { deletedAt: Date.now(), pinned: false }
      : null
  );
  return message !== null;
}

export function setMessagePinned(
  messageId: string,
  conversationId: string,
  userId: string,
  pinned: boolean
) {
  return mutateMessage(messageId, conversationId, userId, () => ({ pinned }));
}

export function toggleReaction(
  messageId: string,
  conversationId: string,
  userId: string,
  emoji: string
) {
  return mutateMessage(messageId, conversationId, userId, (message) => {
    const reactions = { ...message.reactions };
    const users = reactions[emoji] ?? [];
    if (users.includes(userId)) {
      reactions[emoji] = users.filter((id) => id !== userId);
      if (!reactions[emoji].length) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userId];
    }
    return { reactions };
  });
}

/* 
   User search (across profiles_v1)
 */

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

export async function searchUsers(
  query: string,
  excludeUsername: string
): Promise<UserSearchResult[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const searches = await Promise.all([
    db
      .collection(PROF_COL)
      .orderBy('loginUsername')
      .startAt(q)
      .endAt(q + '\uf8ff')
      .limit(15)
      .get(),
    db
      .collection(PROF_COL)
      .orderBy('__name__')
      .startAt(q)
      .endAt(q + '\uf8ff')
      .limit(15)
      .get(),
  ]);

  const results: UserSearchResult[] = [];
  const documents = new Map(searches.flatMap((snap) => snap.docs).map((doc) => [doc.id, doc]));
  for (const doc of documents.values()) {
    if (doc.id === excludeUsername) continue;
    const d = doc.data();
    results.push({
      username: doc.id,
      displayName: d.displayName || `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || doc.id,
      bio: d.bio ?? '',
      location: d.location ?? '',
      pfpUrl: d.pfpUrl ?? '',
      pronouns: d.pronouns ?? '',
      schoolName: d.schoolName ?? '',
      userType: d.userType ?? '',
    });
  }
  return results;
}

/* 
   Group Chat
 */

export interface CreateGroupInput {
  creatorUserId: string;
  creatorDisplayName: string;
  creatorPfpUrl?: string;
  groupName: string;
  groupDescription?: string;
  encrypted?: boolean;
  members: { userId: string; displayName: string; pfpUrl?: string }[];
}

export async function createGroupChat(input: CreateGroupInput): Promise<Conversation> {
  const now = Date.now();
  const participantIds = [
    input.creatorUserId,
    ...input.members.map((m) => m.userId).filter((u) => u !== input.creatorUserId),
  ];
  const participantNames: Record<string, string> = {
    [input.creatorUserId]: input.creatorDisplayName,
  };
  const participantPfpUrls: Record<string, string> = {
    [input.creatorUserId]: input.creatorPfpUrl ?? '',
  };
  for (const m of input.members) {
    participantNames[m.userId] = m.displayName;
    participantPfpUrls[m.userId] = m.pfpUrl ?? '';
  }

  const ref = db.collection(CONV_COL).doc();
  await db.runTransaction(async (transaction) => {
    await assertCurrentAccountReferences(transaction, participantIds);
    transaction.set(ref, {
      type: 'group',
      participantIds,
      participantNames,
      participantPfpUrls,
      groupName: input.groupName.slice(0, 80),
      groupDescription: (input.groupDescription ?? '').slice(0, 200) || null,
      adminUserId: input.creatorUserId,
      encrypted: input.encrypted ?? false,
      lastReadAt: {},
      lastMessage: '',
      lastSenderUserId: '',
      lastAt: now,
      createdAt: now,
    });
  });
  const doc = await ref.get();
  return docToConversation(doc);
}

async function mutateGroup(
  conversationId: string,
  userId: string,
  mutate: (conversation: Conversation) => Partial<Conversation> | null
): Promise<Conversation | null> {
  const ref = db.collection(CONV_COL).doc(conversationId);
  return db.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    if (!document.exists) return null;
    const conversation = docToConversation(document);
    if (conversation.type !== 'group' || !conversation.participantIds.includes(userId)) return null;
    const patch = mutate(conversation);
    if (!patch) return null;
    if (patch.participantIds)
      await assertCurrentAccountReferences(transaction, patch.participantIds);
    if (Object.keys(patch).length) transaction.update(ref, patch);
    return { ...conversation, ...patch };
  });
}

export function updateGroupInfo(
  conversationId: string,
  userId: string,
  patch: { groupName?: string; groupDescription?: string }
) {
  return mutateGroup(conversationId, userId, (conversation) => {
    if (conversation.adminUserId !== userId) return null;
    return {
      ...(patch.groupName !== undefined && { groupName: patch.groupName }),
      ...(patch.groupDescription !== undefined && { groupDescription: patch.groupDescription }),
    };
  });
}

export function addGroupMember(
  conversationId: string,
  userId: string,
  newUserId: string,
  displayName: string
) {
  return mutateGroup(conversationId, userId, (conversation) => {
    if (conversation.adminUserId !== userId) return null;
    if (conversation.participantIds.includes(newUserId)) return {};
    if (conversation.participantIds.length >= 50) throw new InputError('Group is full', 409);
    return {
      participantIds: [...conversation.participantIds, newUserId],
      participantNames: { ...conversation.participantNames, [newUserId]: displayName },
    };
  });
}

export function removeGroupMember(conversationId: string, userId: string, targetId: string) {
  return mutateGroup(conversationId, userId, (conversation) => {
    if (conversation.adminUserId !== userId && userId !== targetId) return null;
    const participantIds = conversation.participantIds.filter((id) => id !== targetId);
    const participantNames = { ...conversation.participantNames };
    const participantPfpUrls = { ...conversation.participantPfpUrls };
    const lastReadAt = { ...conversation.lastReadAt };
    delete participantNames[targetId];
    delete participantPfpUrls[targetId];
    delete lastReadAt[targetId];
    return {
      participantIds,
      participantNames,
      participantPfpUrls,
      lastReadAt,
      adminUserId:
        conversation.adminUserId === targetId
          ? (participantIds[0] ?? null)
          : conversation.adminUserId,
    };
  });
}

export async function markConversationRead(
  conversationId: string,
  username: string
): Promise<void> {
  const ref = db.collection(CONV_COL).doc(conversationId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const conversation = snapshot.data();
    if (!conversation || !conversation.participantIds?.includes(username)) return;
    if ((conversation.lastReadAt?.[username] ?? 0) >= (conversation.lastAt ?? 0)) return;
    transaction.update(ref, new FieldPath('lastReadAt', username), Date.now());
  });
}

export function transferGroupAdmin(conversationId: string, userId: string, newAdminId: string) {
  return mutateGroup(conversationId, userId, (conversation) =>
    conversation.adminUserId === userId && conversation.participantIds.includes(newAdminId)
      ? { adminUserId: newAdminId }
      : null
  );
}
