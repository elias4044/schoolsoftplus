import { resolveAccountReference } from './accountRegistry';
import { db } from './firebaseAdmin';
import { normalizeUserId } from './identity';

export type DeckColor = 'violet' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';

export interface FlashDeck {
  id: string;
  userId: string;
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
  userId: string;
  front: string;
  back: string;
  hint: string;
  tags: string[];
  // SM-2 spaced repetition fields
  repetitions: number;
  easeFactor: number; // default 2.5
  interval: number; // days until next review
  nextReview: number; // unix ms
  lastReview: number | null;
  createdAt: number;
  updatedAt: number;
}

export type FlashDeckPublic = Omit<FlashDeck, 'userId'>;
export type FlashCardPublic = Omit<FlashCard, 'userId'>;

const DECK_COL = 'flashcard_decks_v1';
const CARD_COL = 'flashcard_cards_v1';

function docToDeck(doc: FirebaseFirestore.DocumentSnapshot): FlashDeck {
  const data = doc.data()!;
  return {
    id: doc.id,
    userId: data.userId ?? data.username ?? '',
    title: data.title ?? 'Untitled',
    description: data.description ?? '',
    color: data.color ?? 'violet',
    emoji: data.emoji ?? '\uD83C\uDCCF',
    subjectId: typeof data.subjectId === 'number' ? data.subjectId : null,
    subjectName: typeof data.subjectName === 'string' ? data.subjectName : null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    cardCount: typeof data.cardCount === 'number' ? data.cardCount : 0,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

function docToCard(doc: FirebaseFirestore.DocumentSnapshot): FlashCard {
  const data = doc.data()!;
  return {
    id: doc.id,
    deckId: data.deckId ?? '',
    userId: data.userId ?? '',
    front: data.front ?? '',
    back: data.back ?? '',
    hint: data.hint ?? '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    repetitions: typeof data.repetitions === 'number' ? data.repetitions : 0,
    easeFactor: typeof data.easeFactor === 'number' ? data.easeFactor : 2.5,
    interval: typeof data.interval === 'number' ? data.interval : 1,
    nextReview: typeof data.nextReview === 'number' ? data.nextReview : Date.now(),
    lastReview: typeof data.lastReview === 'number' ? data.lastReview : null,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

export async function getDecksByUser(userId: string): Promise<FlashDeck[]> {
  const snap = await db.collection(DECK_COL).where('userId', '==', userId).get();
  return snap.docs.map(docToDeck).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDeckById(id: string, userId: string): Promise<FlashDeck | null> {
  const doc = await db.collection(DECK_COL).doc(id).get();
  if (!doc.exists) return null;
  const deck = docToDeck(doc);
  if (deck.userId !== userId) return null;
  return deck;
}

export async function createDeck(
  userId: string,
  data: Pick<
    FlashDeck,
    'title' | 'description' | 'color' | 'emoji' | 'subjectId' | 'subjectName' | 'tags'
  >
): Promise<FlashDeck> {
  const now = Date.now();
  const ref = db.collection(DECK_COL).doc();
  const payload = { userId, ...data, cardCount: 0, createdAt: now, updatedAt: now };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function updateDeck(
  id: string,
  userId: string,
  updates: Partial<
    Pick<
      FlashDeck,
      'title' | 'description' | 'color' | 'emoji' | 'subjectId' | 'subjectName' | 'tags'
    >
  >
): Promise<FlashDeck | null> {
  const ref = db.collection(DECK_COL).doc(id);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;
    const existing = docToDeck(doc);
    if (existing.userId !== userId) return null;
    if (
      Object.entries(updates).every(
        ([key, value]) => JSON.stringify(existing[key as keyof FlashDeck]) === JSON.stringify(value)
      )
    )
      return existing;
    const patch = { ...updates, updatedAt: Date.now() };
    transaction.update(ref, patch);
    return { ...existing, ...patch };
  });
}

export async function deleteDeck(id: string, userId: string): Promise<boolean> {
  const ref = db.collection(DECK_COL).doc(id);
  const cardsQuery = db
    .collection(CARD_COL)
    .where('deckId', '==', id)
    .where('userId', '==', userId)
    .limit(400);
  while (true) {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists || docToDeck(doc).userId !== userId) return 'missing';
      const cards = await transaction.get(cardsQuery);
      for (const card of cards.docs) transaction.delete(card.ref);
      if (cards.size < 400) {
        transaction.delete(ref);
        return 'deleted';
      }
      // Updating the parent serializes deletion with concurrent card creation.
      transaction.update(ref, {
        cardCount: Math.max(0, docToDeck(doc).cardCount - cards.size),
        updatedAt: Date.now(),
      });
      return 'continue';
    });
    if (result !== 'continue') return result === 'deleted';
  }
}

export async function getCardsByDeck(deckId: string, userId: string): Promise<FlashCard[]> {
  const snap = await db
    .collection(CARD_COL)
    .where('deckId', '==', deckId)
    .where(normalizeUserId(userId) ? 'userId' : 'username', '==', userId)
    .get();
  return snap.docs.map(docToCard).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createCard(
  deckId: string,
  userId: string,
  data: Pick<FlashCard, 'front' | 'back' | 'hint' | 'tags'>
): Promise<FlashCard | null> {
  const cards = await bulkCreateCards(deckId, userId, [data]);
  return cards?.[0] ?? null;
}

export async function updateCard(
  id: string,
  deckId: string,
  userId: string,
  updates: Partial<
    Pick<
      FlashCard,
      | 'front'
      | 'back'
      | 'hint'
      | 'tags'
      | 'repetitions'
      | 'easeFactor'
      | 'interval'
      | 'nextReview'
      | 'lastReview'
    >
  >
): Promise<FlashCard | null> {
  const ref = db.collection(CARD_COL).doc(id);
  const deckRef = db.collection(DECK_COL).doc(deckId);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const deck = await transaction.get(deckRef);
    if (!doc.exists || !deck.exists || docToDeck(deck).userId !== userId) return null;
    const existing = docToCard(doc);
    if (existing.userId !== userId || existing.deckId !== deckId) return null;
    if (
      Object.entries(updates).every(
        ([key, value]) => JSON.stringify(existing[key as keyof FlashCard]) === JSON.stringify(value)
      )
    )
      return existing;
    const patch = { ...updates, updatedAt: Date.now() };
    transaction.update(ref, patch);
    return { ...existing, ...patch };
  });
}

export async function deleteCard(id: string, deckId: string, userId: string): Promise<boolean> {
  const ref = db.collection(CARD_COL).doc(id);
  const deckRef = db.collection(DECK_COL).doc(deckId);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const deckDoc = await transaction.get(deckRef);
    if (!doc.exists || !deckDoc.exists) return false;
    const card = docToCard(doc);
    const deck = docToDeck(deckDoc);
    if (card.userId !== userId || card.deckId !== deckId || deck.userId !== userId) return false;
    transaction.delete(ref);
    transaction.update(deckRef, {
      cardCount: Math.max(0, deck.cardCount - 1),
      updatedAt: Date.now(),
    });
    return true;
  });
}

export async function getDeckByIdAny(id: string): Promise<FlashDeck | null> {
  const doc = await db.collection(DECK_COL).doc(id).get();
  if (!doc.exists) return null;
  return docToDeck(doc);
}

export async function canImportDeck(
  deck: FlashDeck,
  userId: string,
  messageId?: string
): Promise<boolean> {
  if (deck.userId === userId) return true;
  if (!messageId) return false;

  const message = (await db.collection('messages_v1').doc(messageId).get()).data();
  if (
    !message ||
    message.deletedAt != null ||
    message.shareCard?.type !== 'flashdeck' ||
    message.shareCard.deckId !== deck.id ||
    typeof message.conversationId !== 'string' ||
    !message.conversationId ||
    message.conversationId.includes('/')
  )
    return false;

  const conversation = (
    await db.collection('conversations_v1').doc(message.conversationId).get()
  ).data();
  const sender = message.senderUserId ?? message.senderUsername;
  if (typeof sender !== 'string' || (await resolveAccountReference(sender)) !== deck.userId)
    return false;
  return (
    Array.isArray(conversation?.participantIds) && conversation.participantIds.includes(userId)
  );
}

export async function bulkCreateCards(
  deckId: string,
  userId: string,
  cards: Pick<FlashCard, 'front' | 'back' | 'hint' | 'tags'>[]
): Promise<FlashCard[] | null> {
  if (cards.length === 0) return [];
  const deckRef = db.collection(DECK_COL).doc(deckId);
  const created: FlashCard[] = [];
  // Leave room for the parent count update in every transaction.
  for (let offset = 0; offset < cards.length; offset += 400) {
    const now = Date.now();
    const chunk = cards.slice(offset, offset + 400).map((card) => ({
      ref: db.collection(CARD_COL).doc(),
      data: {
        deckId,
        userId,
        ...card,
        repetitions: 0,
        easeFactor: 2.5,
        interval: 1,
        nextReview: now,
        lastReview: null,
        createdAt: now,
        updatedAt: now,
      },
    }));
    const saved = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(deckRef);
      if (!doc.exists) return false;
      const deck = docToDeck(doc);
      if (deck.userId !== userId) return false;
      for (const card of chunk) transaction.set(card.ref, card.data);
      transaction.update(deckRef, { cardCount: deck.cardCount + chunk.length, updatedAt: now });
      return true;
    });
    if (!saved) return null;
    created.push(...chunk.map(({ ref, data }) => ({ id: ref.id, ...data })));
  }
  return created;
}
