# app/api/lib/rateLimit.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/rateLimit.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `cab9bcfaff303bd4baf5b35f73faaa1482c9e6df616b0965f9f4100b25ee2d10`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## enforceRateLimit

```ts
export function enforceRateLimit(key: string, limit: number, windowMs = 60_000);
```
