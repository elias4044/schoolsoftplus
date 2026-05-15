import { db } from "./firebaseAdmin";
import admin from "firebase-admin";

/* ---------------------------------------------------------- */
/*  Types                                                       */
/* ---------------------------------------------------------- */

export type DeckColor = "violet" | "rose" | "amber" | "emerald" | "sky" | "slate";

export interface FlashDeck {
  id: string;
  username: string;
  title: string;
  description: string;
  color: DeckColor;
  emoji: string;
  subjectId: number | null;
  subjectName: string | null;
  tags: string[];
  cardCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface FlashCard {
  id: string;
  deckId: string;
  username: string;
  front: string;
  back: string;
  hint: string;
  tags: string[];
  // SM-2 spaced repetition fields
  repetitions: number;
  easeFactor: number; // default 2.5
  interval: number;   // days until next review
  nextReview: number; // unix ms
  lastReview: number | null;
  createdAt: number;
  updatedAt: number;
}

export type FlashDeckPublic = Omit<FlashDeck, "username">;
export type FlashCardPublic = Omit<FlashCard, "username">;

const DECK_COL = "flashcard_decks_v1";
const CARD_COL = "flashcard_cards_v1";

/* ---------------------------------------------------------- */
/*  Converters                                                  */
/* ---------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToDeck(doc: FirebaseFirestore.DocumentSnapshot<any>): FlashDeck {
  const d = doc.data()!;
  return {
    id: doc.id,
    username: d.username ?? "",
    title: d.title ?? "Untitled",
    description: d.description ?? "",
    color: d.color ?? "violet",
    emoji: d.emoji ?? "\uD83C\uDCCF",
    subjectId: typeof d.subjectId === "number" ? d.subjectId : null,
    subjectName: typeof d.subjectName === "string" ? d.subjectName : null,
    tags: Array.isArray(d.tags) ? d.tags : [],
    cardCount: typeof d.cardCount === "number" ? d.cardCount : 0,
    createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToCard(doc: FirebaseFirestore.DocumentSnapshot<any>): FlashCard {
  const d = doc.data()!;
  return {
    id: doc.id,
    deckId: d.deckId ?? "",
    username: d.username ?? "",
    front: d.front ?? "",
    back: d.back ?? "",
    hint: d.hint ?? "",
    tags: Array.isArray(d.tags) ? d.tags : [],
    repetitions: typeof d.repetitions === "number" ? d.repetitions : 0,
    easeFactor: typeof d.easeFactor === "number" ? d.easeFactor : 2.5,
    interval: typeof d.interval === "number" ? d.interval : 1,
    nextReview: typeof d.nextReview === "number" ? d.nextReview : Date.now(),
    lastReview: typeof d.lastReview === "number" ? d.lastReview : null,
    createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

/* ---------------------------------------------------------- */
/*  Deck operations                                             */
/* ---------------------------------------------------------- */

export async function getDecksByUser(username: string): Promise<FlashDeck[]> {
  const snap = await db.collection(DECK_COL).where("username", "==", username).get();
  return snap.docs.map(docToDeck).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDeckById(id: string, username: string): Promise<FlashDeck | null> {
  const doc = await db.collection(DECK_COL).doc(id).get();
  if (!doc.exists) return null;
  const deck = docToDeck(doc);
  if (deck.username !== username) return null;
  return deck;
}

export async function createDeck(
  username: string,
  data: Pick<FlashDeck, "title" | "description" | "color" | "emoji" | "subjectId" | "subjectName" | "tags">
): Promise<FlashDeck> {
  const now = Date.now();
  const ref = db.collection(DECK_COL).doc();
  const payload = { username, ...data, cardCount: 0, createdAt: now, updatedAt: now };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function updateDeck(
  id: string,
  username: string,
  updates: Partial<Pick<FlashDeck, "title" | "description" | "color" | "emoji" | "subjectId" | "subjectName" | "tags">>
): Promise<FlashDeck | null> {
  const ref = db.collection(DECK_COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const existing = docToDeck(doc);
  if (existing.username !== username) return null;
  const patch = { ...updates, updatedAt: Date.now() };
  await ref.update(patch);
  return { ...existing, ...patch };
}

export async function deleteDeck(id: string, username: string): Promise<boolean> {
  const ref = db.collection(DECK_COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  if (docToDeck(doc).username !== username) return false;
  // Delete all cards belonging to this deck in a single batch
  const cardsSnap = await db
    .collection(CARD_COL)
    .where("deckId", "==", id)
    .where("username", "==", username)
    .get();
  const batch = db.batch();
  cardsSnap.docs.forEach(c => batch.delete(c.ref));
  batch.delete(ref);
  await batch.commit();
  return true;
}

/* ---------------------------------------------------------- */
/*  Card operations                                             */
/* ---------------------------------------------------------- */

export async function getCardsByDeck(deckId: string, username: string): Promise<FlashCard[]> {
  const snap = await db
    .collection(CARD_COL)
    .where("deckId", "==", deckId)
    .where("username", "==", username)
    .get();
  return snap.docs.map(docToCard).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createCard(
  deckId: string,
  username: string,
  data: Pick<FlashCard, "front" | "back" | "hint" | "tags">
): Promise<FlashCard> {
  const now = Date.now();
  const ref = db.collection(CARD_COL).doc();
  const payload = {
    deckId,
    username,
    ...data,
    repetitions: 0,
    easeFactor: 2.5,
    interval: 1,
    nextReview: now,
    lastReview: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(payload);
  await db.collection(DECK_COL).doc(deckId).update({
    cardCount: admin.firestore.FieldValue.increment(1),
    updatedAt: now,
  });
  return { id: ref.id, ...payload };
}

export async function updateCard(
  id: string,
  username: string,
  updates: Partial<Pick<FlashCard, "front" | "back" | "hint" | "tags" | "repetitions" | "easeFactor" | "interval" | "nextReview" | "lastReview">>
): Promise<FlashCard | null> {
  const ref = db.collection(CARD_COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const existing = docToCard(doc);
  if (existing.username !== username) return null;
  const patch = { ...updates, updatedAt: Date.now() };
  await ref.update(patch);
  return { ...existing, ...patch };
}

export async function deleteCard(id: string, deckId: string, username: string): Promise<boolean> {
  const ref = db.collection(CARD_COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const card = docToCard(doc);
  if (card.username !== username) return false;
  await ref.delete();
  await db.collection(DECK_COL).doc(deckId).update({
    cardCount: admin.firestore.FieldValue.increment(-1),
    updatedAt: Date.now(),
  });
  return true;
}

/** Read a deck by ID without checking ownership — used for share-card imports. */
export async function getDeckByIdAny(id: string): Promise<FlashDeck | null> {
  const doc = await db.collection(DECK_COL).doc(id).get();
  if (!doc.exists) return null;
  return docToDeck(doc);
}

/** Read all cards for a deck without checking ownership — used for share-card imports. */
export async function getCardsByDeckAny(deckId: string): Promise<FlashCard[]> {
  const snap = await db.collection(CARD_COL).where("deckId", "==", deckId).get();
  return snap.docs.map(docToCard).sort((a, b) => a.createdAt - b.createdAt);
}

export async function bulkCreateCards(
  deckId: string,
  username: string,
  cards: Pick<FlashCard, "front" | "back" | "hint" | "tags">[]
): Promise<FlashCard[]> {
  if (cards.length === 0) return [];
  const now = Date.now();
  // Firestore batch limit is 500 ops; slice if needed
  const chunks: typeof cards[] = [];
  for (let i = 0; i < cards.length; i += 490) chunks.push(cards.slice(i, i + 490));

  const created: FlashCard[] = [];
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const card of chunk) {
      const ref = db.collection(CARD_COL).doc();
      const payload = {
        deckId, username, ...card,
        repetitions: 0, easeFactor: 2.5, interval: 1,
        nextReview: now, lastReview: null, createdAt: now, updatedAt: now,
      };
      batch.set(ref, payload);
      created.push({ id: ref.id, ...payload });
    }
    await batch.commit();
  }
  await db.collection(DECK_COL).doc(deckId).update({
    cardCount: admin.firestore.FieldValue.increment(cards.length),
    updatedAt: now,
  });
  return created;
}
