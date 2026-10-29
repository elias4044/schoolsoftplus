# app/api/lib/identity.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/identity.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `015d325dcc11d985d3355f04dacd4eb75267ef64b061f2a342526ff66f306664`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## normalizeUserId

```ts
export function normalizeUserId(value: unknown): string | null;
```

## assertUserId

```ts
export function assertUserId(value: unknown): asserts value is string;
```

## assertSchool

```ts
export function assertSchool(value: string): string;
```

## Runtime validation implementation

This complete module supplies checks beyond TypeScript declarations.

```ts
import { InputError } from './validation';

export function normalizeUserId(value: unknown): string | null {
  const id = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null;
}

export function assertUserId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !normalizeUserId(value)) {
    throw new InputError('Invalid user id');
  }
}

export function assertSchool(value: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new InputError('Invalid school');
  return value;
}
```
