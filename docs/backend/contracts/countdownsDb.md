# app/api/lib/countdownsDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/countdownsDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `42f4b90a05e8c1252f5986d160a92ce1afe9cb0702fb1148dc2f8db3fc337215`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## CountdownCategory

```ts
export type CountdownCategory = 'exam' | 'holiday' | 'birthday' | 'event' | 'deadline' | 'custom';
```

## CountdownTheme

```ts
export type CountdownTheme = 'violet' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';
```

## Countdown

```ts
export interface Countdown {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: number; // unix ms
  category: CountdownCategory;
  theme: CountdownTheme;
  emoji: string;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## CountdownPublic

```ts
export type CountdownPublic = Omit<Countdown, 'userId'>;
```

## getCountdownsByUser

```ts
export async function getCountdownsByUser(userId: string): Promise<Countdown[]>;
```

## getCountdownById

```ts
export async function getCountdownById(id: string, userId: string): Promise<Countdown | null>;
```

## createCountdown

```ts
export async function createCountdown(
  userId: string,
  fields: Omit<Countdown, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Countdown>;
```

## updateCountdown

```ts
export async function updateCountdown(
  id: string,
  userId: string,
  patch: Partial<Omit<Countdown, 'id' | 'userId' | 'createdAt'>>
): Promise<Countdown | null>;
```

## deleteCountdown

```ts
export async function deleteCountdown(id: string, userId: string): Promise<boolean>;
```
