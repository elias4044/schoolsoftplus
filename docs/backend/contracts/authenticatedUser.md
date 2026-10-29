# app/api/lib/authenticatedUser.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `6dcc1f5ef147ffc8a7e7400d9e6b2ad911347c5209cea4ca1a5c872908ce966e`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## getAuthenticatedUserId

```ts
export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null>;
```
