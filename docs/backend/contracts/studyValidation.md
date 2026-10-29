# app/api/lib/studyValidation.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `484f7e5acb2d09552479fadf6caff4b56cdcd8b15b42e8c0fd9dbdb704371ac7`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## noteFields

```ts
export const noteFields = {
  title: text(500),
  content: text(200_000),
  status: oneOf(['draft', 'published', 'archived']),
};
```

## deckFields

```ts
export const deckFields = {
  title: nonEmptyText(120),
  description: text(500),
  color: oneOf(deckColors),
  emoji: text(8),
  subjectId: nullable(nonNegativeInteger),
  subjectName: nullable(text(80)),
  tags: tags(20),
};
```

## cardFields

```ts
export const cardFields = {
  front: text(2000),
  back: text(2000),
  hint: text(500),
  tags: tags(10),
};
```

## parseCardInput

```ts
export function parseCardInput(value: unknown);
```

## reviewFields

```ts
export const reviewFields = {
  repetitions: nonNegativeInteger,
  easeFactor: (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 1.3 && value <= 4,
  interval: (value: unknown) => nonNegativeInteger(value) && (value as number) >= 1,
  nextReview: timestamp,
  lastReview: nullable(timestamp),
};
```

## countdownFields

```ts
export const countdownFields = {
  title: nonEmptyText(200),
  description: text(2000),
  targetDate: timestamp,
  category: oneOf(['exam', 'holiday', 'birthday', 'event', 'deadline', 'custom']),
  theme: oneOf(deckColors),
  emoji: text(8),
  pinned: boolean,
  archived: boolean,
};
```

## Runtime validation implementation

This complete module supplies checks beyond TypeScript declarations.

```ts
import {
  boolean,
  InputError,
  isObject,
  nonEmptyText,
  nonNegativeInteger,
  nullable,
  oneOf,
  tags,
  text,
  timestamp,
  validateFields,
} from './routeValidation';

const deckColors = ['violet', 'rose', 'amber', 'emerald', 'sky', 'slate'];

export const noteFields = {
  title: text(500),
  content: text(200_000),
  status: oneOf(['draft', 'published', 'archived']),
};

export const deckFields = {
  title: nonEmptyText(120),
  description: text(500),
  color: oneOf(deckColors),
  emoji: text(8),
  subjectId: nullable(nonNegativeInteger),
  subjectName: nullable(text(80)),
  tags: tags(20),
};

export const cardFields = {
  front: text(2000),
  back: text(2000),
  hint: text(500),
  tags: tags(10),
};

export function parseCardInput(value: unknown) {
  if (!isObject(value)) throw new InputError('Invalid card');
  validateFields(value, cardFields);
  const front = typeof value.front === 'string' ? value.front.trim() : '';
  const back = typeof value.back === 'string' ? value.back.trim() : '';
  if (!front && !back) throw new InputError('Each card needs front or back text');
  return {
    front,
    back,
    hint: typeof value.hint === 'string' ? value.hint.trim() : '',
    tags: Array.isArray(value.tags) ? (value.tags as string[]).map((tag) => tag.trim()) : [],
  };
}

export const reviewFields = {
  repetitions: nonNegativeInteger,
  easeFactor: (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 1.3 && value <= 4,
  interval: (value: unknown) => nonNegativeInteger(value) && (value as number) >= 1,
  nextReview: timestamp,
  lastReview: nullable(timestamp),
};

export const countdownFields = {
  title: nonEmptyText(200),
  description: text(2000),
  targetDate: timestamp,
  category: oneOf(['exam', 'holiday', 'birthday', 'event', 'deadline', 'custom']),
  theme: oneOf(deckColors),
  emoji: text(8),
  pinned: boolean,
  archived: boolean,
};
```
