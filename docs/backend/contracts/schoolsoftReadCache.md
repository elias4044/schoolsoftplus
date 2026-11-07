# app/api/lib/schoolsoftReadCache.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoftReadCache.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `044ee8019928b423d3a484c36307928649f9909bb34d677cb45c2958a96020f4`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## forgetSchoolsoftRead

```ts
export function forgetSchoolsoftRead(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  path: string
): void;
```

## cachedSchoolsoftGet

```ts
export async function cachedSchoolsoftGet<T = unknown>(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  path: string,
  { maxAge = 60_000, force = false }: { maxAge?: number; force?: boolean } = {}
): Promise<{ data: T }>;
```
