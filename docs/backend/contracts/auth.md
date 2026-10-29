# app/api/lib/auth.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/auth.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `e8a7ed26af4c031e3427864ab5e6da3a7e2d41bc26d9697df684677a248ae9a6`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## authUser

```ts
export async function authUser(cookies: string, school = 'engelska'): Promise<boolean>;
```

## authUserWithUsername

```ts
export async function authUserWithUsername(
  cookies: string,
  expectedUsername: string,
  school = 'engelska'
): Promise<boolean>;
```
