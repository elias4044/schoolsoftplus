import { prefetchLunchPage } from '@/lib/cache/lunch';
import { prefetchSchedulePage } from '@/lib/cache/schedule';
import { prefetchCompletedPage, prefetchSubjectsPage } from '@/lib/cache/subjects';

/**
 * Registry of per-page prefetchers. Add new pages here and every caller below picks them up.
 * Each function fetches what that page needs and stores it in the cache.
 */
export const prefetchers = {
  subjects: prefetchSubjectsPage,
  completed: prefetchCompletedPage,
  schedule: prefetchSchedulePage,
  lunch: prefetchLunchPage,
} as const;

export type PrefetchPage = keyof typeof prefetchers;

/** Prefetch specific pages (or all of them). Never throws. */
export async function prefetch(pages: PrefetchPage[] = Object.keys(prefetchers) as PrefetchPage[]) {
  await Promise.allSettled(pages.map((p) => prefetchers[p]()));
}
