# lib/accountReferences.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/accountReferences.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `2a8b4aca2c933ad01ccbf29d2f8961d99d7a287a5a45328ee1acf507fb64e483`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## AccountAliases

```ts
export type AccountAliases = Record<string, string>;
```

## accountReference

```ts
export function accountReference(value: string, aliases: AccountAliases): string;
```

## normalizeMessageIdentity

```ts
export function normalizeMessageIdentity<
  T extends {
    senderUserId?: string;
    senderUsername?: string;
    reactions?: Record<string, string[]>;
    shareCard?: { type: string; sharedByUserId?: string; sharedByUsername?: string } | null;
  },
>(message: T, aliases: AccountAliases);
```
