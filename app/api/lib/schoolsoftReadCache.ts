import { createHash } from 'node:crypto';

import { createSchoolsoftClient } from './schoolsoft';

const entries = new Map<string, { data: unknown; expiresAt: number }>();
const pending = new Map<string, Promise<{ data: unknown }>>();
const MAX_ENTRIES = 512;

function readKey(api: ReturnType<typeof createSchoolsoftClient>, cookies: string, path: string) {
  if (!api.defaults?.baseURL) return null;
  const scope = createHash('sha256').update(`${api.defaults.baseURL}\0${cookies}`).digest('hex');
  return `${scope}:${path}`;
}

export function forgetSchoolsoftRead(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  path: string
): void {
  const key = readKey(api, cookies, path);
  if (key) entries.delete(key);
}

export async function cachedSchoolsoftGet<T = unknown>(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  path: string,
  { maxAge = 60_000, force = false }: { maxAge?: number; force?: boolean } = {}
): Promise<{ data: T }> {
  const key = readKey(api, cookies, path);
  // Non-Axios clients are used by isolated route tests.
  if (!key) return api.get(path, { headers: { Cookie: cookies }, responseType: 'json' });
  const hit = entries.get(key);
  if (!force && hit && hit.expiresAt > Date.now()) return { data: hit.data as T };
  const inflight = pending.get(key);
  if (inflight) return inflight as Promise<{ data: T }>;
  const request = api
    .get(path, { headers: { Cookie: cookies }, responseType: 'json' })
    .then(({ data }) => {
      if (
        (data !== null && typeof data === 'object') ||
        typeof data === 'number' ||
        (typeof data === 'string' && /^\d+$/.test(data))
      ) {
        entries.delete(key);
        entries.set(key, { data, expiresAt: Date.now() + maxAge });
        while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
      }
      return { data };
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request as Promise<{ data: T }>;
}
