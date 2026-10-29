# app/api/lib/accountRegistry.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/accountRegistry.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `fc0fe486e50b7c62e7ecc52086d75c4ebdb9357fcb0d43257cde76a03512317a`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## isAccountReference

```ts
export function isAccountReference(value: unknown): value is string;
```

## resolveAccountReference

```ts
export async function resolveAccountReference(value: string): Promise<string>;
```

## assertCurrentAccountReferences

```ts
export async function assertCurrentAccountReferences(
  transaction: FirebaseFirestore.Transaction,
  references: string[]
);
```
