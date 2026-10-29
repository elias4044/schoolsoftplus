# app/api/lib/validation.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/validation.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `33cc207b02dc28c4c96236c7240b105d3b38de158132c82473eb893983e0114c`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## InputError

```ts
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}
```

## isObject

```ts
export function isObject(value: unknown): value is Record<string, unknown>;
```

## assertDocumentId

```ts
export function assertDocumentId(id: string | null): asserts id is string;
```

## validateFields

```ts
export function validateFields(
  body: Record<string, unknown>,
  fields: Record<string, Validator>,
  requireUpdate = false
);
```

## text

```ts
export const text =
  (maxLength: number): Validator =>
  (value) =>
    typeof value === 'string' && value.length <= maxLength;
```

## nonEmptyText

```ts
export const nonEmptyText =
  (maxLength: number): Validator =>
  (value) =>
    text(maxLength)(value) && (value as string).trim().length > 0;
```

## oneOf

```ts
export const oneOf =
  (values: readonly string[]): Validator =>
  (value) =>
    typeof value === 'string' && values.includes(value);
```

## nullable

```ts
export const nullable =
  (validate: Validator): Validator =>
  (value) =>
    value === null || validate(value);
```

## nonNegativeInteger

```ts
export const nonNegativeInteger: Validator = (value) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
```

## timestamp

```ts
export const timestamp: Validator = (value) =>
  nonNegativeInteger(value) && Number.isFinite(new Date(value as number).getTime());
```

## boolean

```ts
export const boolean: Validator = (value) => typeof value === 'boolean';
```

## tags

```ts
export const tags =
  (maxCount: number): Validator =>
  (value) =>
    Array.isArray(value) && value.length <= maxCount && value.every(text(40));
```

## Runtime validation implementation

This complete module supplies checks beyond TypeScript declarations.

```ts
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function assertDocumentId(id: string | null): asserts id is string {
  if (!id || id === '.' || id === '..' || id.includes('/') || Buffer.byteLength(id) > 1500) {
    throw new InputError('Invalid document id');
  }
}

type Validator = (value: unknown) => boolean;

export function validateFields(
  body: Record<string, unknown>,
  fields: Record<string, Validator>,
  requireUpdate = false
) {
  let count = 0;
  for (const [field, validate] of Object.entries(fields)) {
    if (!(field in body)) continue;
    if (!validate(body[field])) throw new InputError(`Invalid ${field}`);
    count++;
  }
  if (requireUpdate && count === 0) throw new InputError('No supported fields provided');
}

export const text =
  (maxLength: number): Validator =>
  (value) =>
    typeof value === 'string' && value.length <= maxLength;

export const nonEmptyText =
  (maxLength: number): Validator =>
  (value) =>
    text(maxLength)(value) && (value as string).trim().length > 0;

export const oneOf =
  (values: readonly string[]): Validator =>
  (value) =>
    typeof value === 'string' && values.includes(value);

export const nullable =
  (validate: Validator): Validator =>
  (value) =>
    value === null || validate(value);

export const nonNegativeInteger: Validator = (value) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export const timestamp: Validator = (value) =>
  nonNegativeInteger(value) && Number.isFinite(new Date(value as number).getTime());

export const boolean: Validator = (value) => typeof value === 'boolean';

export const tags =
  (maxCount: number): Validator =>
  (value) =>
    Array.isArray(value) && value.length <= maxCount && value.every(text(40));
```
