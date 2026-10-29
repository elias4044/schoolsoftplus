# app/api/lib/flashcardsDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `e4cf9b7989eafd02110a952d4899a71fe4834d5848d08574eae2dd6572cb29b6`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## DeckColor

```ts
export type DeckColor = 'violet' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';
```

## FlashDeck

```ts
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
```

## FlashCard

```ts
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
```

## FlashDeckPublic

```ts
export type FlashDeckPublic = Omit<FlashDeck, 'userId'>;
```

## FlashCardPublic

```ts
export type FlashCardPublic = Omit<FlashCard, 'userId'>;
```

## getDecksByUser

```ts
export async function getDecksByUser(userId: string): Promise<FlashDeck[]>;
```

## getDeckById

```ts
export async function getDeckById(id: string, userId: string): Promise<FlashDeck | null>;
```

## createDeck

```ts
export async function createDeck(
  userId: string,
  data: Pick<
    FlashDeck,
    'title' | 'description' | 'color' | 'emoji' | 'subjectId' | 'subjectName' | 'tags'
  >
): Promise<FlashDeck>;
```

## updateDeck

```ts
export async function updateDeck(
  id: string,
  userId: string,
  updates: Partial<
    Pick<
      FlashDeck,
      'title' | 'description' | 'color' | 'emoji' | 'subjectId' | 'subjectName' | 'tags'
    >
  >
): Promise<FlashDeck | null>;
```

## deleteDeck

```ts
export async function deleteDeck(id: string, userId: string): Promise<boolean>;
```

## getCardsByDeck

```ts
export async function getCardsByDeck(deckId: string, userId: string): Promise<FlashCard[]>;
```

## createCard

```ts
export async function createCard(
  deckId: string,
  userId: string,
  data: Pick<FlashCard, 'front' | 'back' | 'hint' | 'tags'>
): Promise<FlashCard | null>;
```

## updateCard

```ts
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
): Promise<FlashCard | null>;
```

## deleteCard

```ts
export async function deleteCard(id: string, deckId: string, userId: string): Promise<boolean>;
```

## getDeckByIdAny

```ts
export async function getDeckByIdAny(id: string): Promise<FlashDeck | null>;
```

## canImportDeck

```ts
export async function canImportDeck(
  deck: FlashDeck,
  userId: string,
  messageId?: string
): Promise<boolean>;
```

## bulkCreateCards

```ts
export async function bulkCreateCards(
  deckId: string,
  userId: string,
  cards: Pick<FlashCard, 'front' | 'back' | 'hint' | 'tags'>[]
): Promise<FlashCard[] | null>;
```
