# app/api/lib/layoutDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/layoutDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `c77a154942631c95d4aefed187438bcb73044cc0a8df6da92dd4434424e58593`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## getLayout

```ts
export async function getLayout(userId: string): Promise<DashboardLayout | null>;
```

## saveLayout

```ts
export async function saveLayout(userId: string, layout: DashboardLayout): Promise<void>;
```
