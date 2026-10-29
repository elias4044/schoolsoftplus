import { NextResponse } from 'next/server';

import { applySessionCookieUpdates, getRequestSession } from './schoolsoft';
import { assertDocumentId, InputError, isObject } from './validation';

export {
  assertDocumentId,
  InputError,
  isObject,
  validateFields,
  text,
  nonEmptyText,
  oneOf,
  nullable,
  nonNegativeInteger,
  timestamp,
  boolean,
  tags,
} from './validation';

export function withValidation<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    let response: Response;
    try {
      const request = args[0] as Request | undefined;
      if (request?.url) {
        const url = new URL(request.url);
        const school = request.headers.get('x-school') ?? url.searchParams.get('school');
        for (const key of ['week', 'year', 'orgid']) {
          const value = url.searchParams.get(key);
          if (value === null) continue;
          const number = Number(value);
          if (
            !/^\d+$/.test(value) ||
            !Number.isSafeInteger(number) ||
            number < 1 ||
            (key === 'week' && number > 53) ||
            (key === 'year' && (number < 2000 || number > 2200))
          )
            throw new InputError(`Invalid ${key}`);
        }
        if (/^\/api\/(?:assignment|subjects|news|grade-tracker)\//.test(url.pathname)) {
          const id = url.pathname.split('/')[3];
          if (
            !['results_all', 'legacy', 'pfp'].includes(id) &&
            (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)
          )
            throw new InputError('Invalid SchoolSoft resource id');
        }
        if (school !== null && !/^[a-zA-Z0-9_-]{1,100}$/.test(school))
          throw new InputError('Invalid school');
      }
      const context = args[1] as { params?: Promise<Record<string, string>> } | undefined;
      if (context?.params) {
        for (const value of Object.values(await context.params)) assertDocumentId(value);
      }
      response = await handler(...args);
    } catch (error) {
      if (error instanceof InputError) {
        response = NextResponse.json(
          { success: false, error: error.message, message: error.message },
          { status: error.status }
        );
      } else {
        console.error(
          '[api] Request failed:',
          error instanceof Error ? error.name : 'Unknown error'
        );
        response = NextResponse.json(
          { success: false, error: 'Request failed. Please try again.' },
          { status: 500 }
        );
      }
    }
    const request = args[0] as Request | undefined;
    if (request && response instanceof NextResponse) {
      const cachedSession = getRequestSession(request);
      const session = cachedSession ? await cachedSession.catch(() => null) : null;
      if (session?.cookieUpdates) applySessionCookieUpdates(response, session.cookieUpdates);
    }
    if (!response.headers.has('Cache-Control'))
      response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}

export async function readRequestBytes(request: Request, maxBytes: number): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('Request body is required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new InputError('Request body is too large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const bytes = await readRequestBytes(request, 4_000_000);
  let body: unknown;
  try {
    body = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new InputError('Invalid JSON');
  }
  if (!isObject(body)) throw new InputError('A JSON object is required');
  return body;
}
