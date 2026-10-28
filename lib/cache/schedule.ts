import { apiFetch } from '@/lib/api-client';
import { dedupe, readCache, writeCache } from '@/lib/cache';
import { getWeekBounds, mapScheduleEvent, type Lesson } from '@/lib/schedule-utils';

type Week = ReturnType<typeof getWeekBounds>['week'];

export const scheduleKey = (week: Week) => `schedule:week:${week}`;

export function fetchSchedule(week: Week): Promise<Lesson[]> {
  const key = scheduleKey(week);
  return dedupe(key, async () => {
    const res = await apiFetch<{ success: boolean; schedule: any[] }>(`/api/schedule?week=${week}`);
    if (!Array.isArray(res?.schedule)) throw new Error('Invalid schedule response');
    const lessons = res.schedule.map(mapScheduleEvent).filter((l): l is Lesson => l !== null);
    writeCache(key, lessons);
    return lessons;
  });
}

/**
 * Fetch and cache several weeks, given as offsets from the current week (0 = this week).
 * With `maxAgeMs`, weeks cached more recently than that are skipped.
 */
export async function prefetchScheduleWeeks(
  offsets: number[],
  { maxAgeMs = 0 }: { maxAgeMs?: number } = {}
): Promise<void> {
  await Promise.all(
    offsets.map(async (offset) => {
      const { week } = getWeekBounds(offset);
      if (maxAgeMs > 0) {
        const cached = readCache<Lesson[]>(scheduleKey(week));
        if (cached && Date.now() - cached.savedAt < maxAgeMs) return;
      }
      try {
        await fetchSchedule(week);
      } catch {
        /* prefetch is best-effort */
      }
    })
  );
}

/** Schedule page: this week first, then next week and last week. */
export function prefetchSchedulePage(offsets: number[] = [0, 1, -1]): Promise<void> {
  return prefetchScheduleWeeks(offsets);
}
