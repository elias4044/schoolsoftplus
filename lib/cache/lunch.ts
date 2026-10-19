import { apiFetch } from "@/lib/api-client";
import { dedupe, readCache, writeCache } from "@/lib/cache";

/* =========================================================
   Types
========================================================= */
export interface ApiDish {
  dishType?: string;
  dish?: string;
}

export interface ApiDay {
  dayId: number;
  dishes?: ApiDish[];
}


export function getWeek(offset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const year = thursday.getFullYear();

  const jan4 = new Date(year, 0, 4);
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const week = 1 + Math.round((monday.getTime() - firstMonday.getTime()) / (7 * 86_400_000));

  const fmt = (d: Date) => d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });

  return { monday, week, year, range: `${fmt(monday)} – ${fmt(friday)}` };
}


export const lunchKey = (year: number, week: number) => `lunch:${year}-${week}`;


export function fetchLunch(year: number, week: number): Promise<ApiDay[]> {
  const key = lunchKey(year, week);
  return dedupe(key, async () => {
    const res = await apiFetch<{ success: boolean; data: ApiDay[] }>("/api/lunch", {
      params: { week, year },
    });
    if (!Array.isArray(res?.data)) throw new Error("Invalid lunch response");
    writeCache(key, res.data);
    return res.data;
  });
}


/**
 * Fetch and cache several weeks, given as offsets from the current week (0 = this week).
 * With `maxAgeMs`, weeks cached more recently than that are skipped.
 */
export async function prefetchLunchWeeks(
  offsets: number[],
  { maxAgeMs = 0 }: { maxAgeMs?: number } = {}
): Promise<void> {
  await Promise.all(
    offsets.map(async offset => {
      const { week, year } = getWeek(offset);
      if (maxAgeMs > 0) {
        const cached = readCache<ApiDay[]>(lunchKey(year, week));
        if (cached && Date.now() - cached.savedAt < maxAgeMs) return;
      }
      try {
        await fetchLunch(year, week);
      } catch {
        /* prefetch is best-effort */
      }
    })
  );
}

/** Lunch page: this week and next week (menus are usually published ahead). */
export function prefetchLunchPage(offsets: number[] = [0, 1]): Promise<void> {
  return prefetchLunchWeeks(offsets);
}