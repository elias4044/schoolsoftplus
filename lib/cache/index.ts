import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Bump CACHE_VERSION whenever a cached shape changes, so old entries are ignored.
 */
const CACHE_VERSION = 1;
const PREFIX = `cache:v${CACHE_VERSION}:`;

export interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function readCache<T>(key: string): CacheEntry<T> | null {
  const hit = memory.get(key);
  if (hit) return hit as CacheEntry<T>;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.savedAt !== 'number' || !('data' in entry)) return null;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, savedAt: Date.now() };
  memory.set(key, entry);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota exceeded or storage unavailable: memory copy still works this session */
  }
}

/** Remove cached entries whose key starts with `keyPrefix` (everything when omitted). */
export function clearCache(keyPrefix = ''): void {
  for (const k of [...memory.keys()]) if (k.startsWith(keyPrefix)) memory.delete(k);
  if (typeof window === 'undefined') return;
  try {
    const full = PREFIX + keyPrefix;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(full)) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/** Share one in-flight request per key (React strict mode, prefetch + page mounting together). */
export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function sameJson(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Returns cached data immediately (before first paint), then revalidates via `fetcher`.
 * `fetcher` is responsible for writing the cache (the shared fetch functions already do).
 * If the revalidation fails, the cached data stays on screen.
 */
export function useCachedResource<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useIsoLayoutEffect(() => {
    const cached = readCache<T>(key);
    setData(cached ? cached.data : null);
  }, [key]);

  const refresh = useCallback(() => {
    let cancelled = false;
    setRefreshing(true);
    setError(false);
    fetcherRef
      .current()
      .then((fresh) => {
        if (cancelled) return;
        // Keep the old reference when nothing changed so dependants don't re-run.
        setData((prev) => (prev !== null && sameJson(prev, fresh) ? prev : fresh));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [key, refresh]);

  return {
    data,
    /** True only while there is nothing to show yet (no cache and request pending). */
    loading: data === null && refreshing,
    /** True while a background revalidation is running. */
    refreshing,
    error,
    refresh,
  };
}
