# app/api/lib/loginStats.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/loginStats.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `8e4d91ec498ad70627ef68bbe247b4480b62c7f9d32c6e8906da6af8230d577b`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## recordLogin

```ts
export async function recordLogin(
  userId: string,
  school: string,
  method: string
): Promise<boolean>;
```
