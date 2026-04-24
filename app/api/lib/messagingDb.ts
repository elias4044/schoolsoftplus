import { db } from "./firebaseAdmin";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export interface ReplyTo {
  messageId: string;
  content: string;
  senderDisplayName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderUsername: string;
  senderDisplayName: string;
  content: string;
  edited: boolean;
  editedAt: number | null;
  pinned: boolean;
  deletedAt: number | null; // soft-delete
  createdAt: number;
  reactions: Record<string, string[]>; // emoji → list of usernames
  replyTo: ReplyTo | null;
}

export interface Conversation {
  id: string;
  participants: string[];        // usernames (exactly 2 for DMs)
  participantNames: Record<string, string>; // username → displayName
  lastMessage: string;
  lastSenderUsername: string;
  lastAt: number;
  createdAt: number;
}

/* ─────────────────────────────────────────────────────────────
   Collections
───────────────────────────────────────────────────────────── */

const CONV_COL = "conversations_v1";
const MSG_COL  = "messages_v1";
const PROF_COL = "profiles_v1";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToConversation(doc: FirebaseFirestore.DocumentSnapshot<any>): Conversation {
  const d = doc.data()!;
  return {
    id: doc.id,
    participants:        d.participants ?? [],
    participantNames:    d.participantNames ?? {},
    lastMessage:         d.lastMessage ?? "",
    lastSenderUsername:  d.lastSenderUsername ?? "",
    lastAt:              typeof d.lastAt    === "number" ? d.lastAt    : 0,
    createdAt:           typeof d.createdAt === "number" ? d.createdAt : 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToMessage(doc: FirebaseFirestore.DocumentSnapshot<any>): Message {
  const d = doc.data()!;
  return {
    id:                  doc.id,
    conversationId:      d.conversationId      ?? "",
    senderUsername:      d.senderUsername      ?? "",
    senderDisplayName:   d.senderDisplayName   ?? "",
    content:             d.content             ?? "",
    edited:              d.edited              ?? false,
    editedAt:            d.editedAt            ?? null,
    pinned:              d.pinned              ?? false,
    deletedAt:           d.deletedAt           ?? null,
    createdAt:           typeof d.createdAt === "number" ? d.createdAt : 0,
    reactions:           d.reactions           ?? {},
    replyTo:             d.replyTo             ?? null,
  };
}

/* ─────────────────────────────────────────────────────────────
   Conversations
───────────────────────────────────────────────────────────── */

export async function getConversationsForUser(username: string): Promise<Conversation[]> {
  const snap = await db
    .collection(CONV_COL)
    .where("participants", "array-contains", username)
    .orderBy("lastAt", "desc")
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
  displayNameB: string
): Promise<{ conversation: Conversation; created: boolean }> {
  // Canonical participant order so duplicate DMs can't be created
  const participants = [usernameA, usernameB].sort();

  const snap = await db
    .collection(CONV_COL)
    .where("participants", "==", participants)
    .limit(1)
    .get();

  if (!snap.empty) return { conversation: docToConversation(snap.docs[0]), created: false };

  const now = Date.now();
  const ref  = db.collection(CONV_COL).doc();
  const data = {
    participants,
    participantNames: { [usernameA]: displayNameA, [usernameB]: displayNameB },
    lastMessage:        "",
    lastSenderUsername: "",
    lastAt:    now,
    createdAt: now,
  };
  await ref.set(data);
  const doc = await ref.get();
  return { conversation: docToConversation(doc), created: true };
}

/* Update participant display name snapshot if the user edits their profile */
export async function updateParticipantName(username: string, displayName: string) {
  const snap = await db
    .collection(CONV_COL)
    .where("participants", "array-contains", username)
    .get();
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { [`participantNames.${username}`]: displayName });
  }
  await batch.commit();
}

/* ─────────────────────────────────────────────────────────────
   Messages
───────────────────────────────────────────────────────────── */

export async function getMessages(conversationId: string, limit = 60): Promise<Message[]> {
  const snap = await db
    .collection(MSG_COL)
    .where("conversationId", "==", conversationId)
    .orderBy("createdAt", "asc")
    .limitToLast(limit)
    .get();
  return snap.docs.map(docToMessage);
}

export async function getPinnedMessages(conversationId: string): Promise<Message[]> {
  const snap = await db
    .collection(MSG_COL)
    .where("conversationId", "==", conversationId)
    .where("pinned", "==", true)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map(docToMessage).filter(m => m.deletedAt === null);
}

export async function createMessage(
  conversationId: string,
  senderUsername: string,
  senderDisplayName: string,
  content: string,
  replyTo?: ReplyTo | null
): Promise<Message> {
  const now = Date.now();
  const ref  = db.collection(MSG_COL).doc();
  const data = {
    conversationId,
    senderUsername,
    senderDisplayName,
    content,
    edited:    false,
    editedAt:  null,
    pinned:    false,
    deletedAt: null,
    createdAt: now,
    reactions: {},
    replyTo:   replyTo ?? null,
  };
  await ref.set(data);

  // Update conversation meta
  await db.collection(CONV_COL).doc(conversationId).update({
    lastMessage:        content.slice(0, 120),
    lastSenderUsername: senderUsername,
    lastAt:             now,
  });

  return { id: ref.id, ...data };
}

export async function editMessage(
  messageId: string,
  senderUsername: string,
  newContent: string
): Promise<Message | null> {
  const ref = db.collection(MSG_COL).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const msg = docToMessage(doc);
  if (msg.senderUsername !== senderUsername) return null; // ownership check
  if (msg.deletedAt !== null) return null;

  const now = Date.now();
  await ref.update({ content: newContent, edited: true, editedAt: now });
  return { ...msg, content: newContent, edited: true, editedAt: now };
}

export async function deleteMessage(
  messageId: string,
  senderUsername: string
): Promise<boolean> {
  const ref = db.collection(MSG_COL).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const msg = docToMessage(doc);
  if (msg.senderUsername !== senderUsername) return false;

  await ref.update({ deletedAt: Date.now(), pinned: false });
  return true;
}

export async function togglePinMessage(
  messageId: string,
  conversationId: string,
  requestingUsername: string
): Promise<Message | null> {
  const ref = db.collection(MSG_COL).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const msg = docToMessage(doc);
  if (msg.conversationId !== conversationId) return null;
  if (msg.deletedAt !== null) return null;

  const newPinned = !msg.pinned;
  await ref.update({ pinned: newPinned });
  return { ...msg, pinned: newPinned };
}

export async function toggleReaction(
  messageId: string,
  conversationId: string,
  username: string,
  emoji: string
): Promise<Message | null> {
  const ref = db.collection(MSG_COL).doc(messageId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const msg = docToMessage(doc);
  if (msg.conversationId !== conversationId) return null;
  if (msg.deletedAt !== null) return null;

  const reactions = { ...msg.reactions };
  const users = reactions[emoji] ?? [];
  if (users.includes(username)) {
    reactions[emoji] = users.filter(u => u !== username);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, username];
  }
  await ref.update({ reactions });
  return { ...msg, reactions };
}

/* ─────────────────────────────────────────────────────────────
   User search (across profiles_v1)
───────────────────────────────────────────────────────────── */

export interface UserSearchResult {
  username: string;
  displayName: string;
  schoolName: string;
  userType: string;
}

export async function searchUsers(
  query: string,
  excludeUsername: string
): Promise<UserSearchResult[]> {
  // Firestore doesn't support full-text — do a prefix scan on username field
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const snap = await db
    .collection(PROF_COL)
    .orderBy("__name__")
    .startAt(q)
    .endAt(q + "\uf8ff")
    .limit(15)
    .get();

  const results: UserSearchResult[] = [];
  for (const doc of snap.docs) {
    if (doc.id === excludeUsername) continue;
    const d = doc.data();
    results.push({
      username:    doc.id,
      displayName: d.displayName || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || doc.id,
      schoolName:  d.schoolName  ?? "",
      userType:    d.userType    ?? "",
    });
  }
  return results;
}
