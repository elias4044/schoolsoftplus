import { NextResponse } from 'next/server';

export class InputError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export function withValidation<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    let response: Response;
    try {
      response = await handler(...args);
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      response = NextResponse.json({ error: error.message }, { status: error.status });
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('A JSON object is required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4_000_000) {
        await reader.cancel();
        throw new InputError('Request body is too large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InputError('Invalid JSON');
  }
  if (!isObject(body)) throw new InputError('A JSON object is required');
  return body;
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
