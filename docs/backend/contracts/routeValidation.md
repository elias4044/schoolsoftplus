# app/api/lib/routeValidation.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `ca71dea915c6ad8a0c7d1d416cfbfca19cdb14b914d55dd2362a116dbbe1471f`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## withValidation

```ts
export function withValidation<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
);
```

## readRequestBytes

```ts
export async function readRequestBytes(request: Request, maxBytes: number): Promise<Buffer>;
```

## readJsonObject

```ts
export async function readJsonObject(request: Request): Promise<Record<string, unknown>>;
```
