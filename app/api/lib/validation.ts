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
