import { apiFetch } from '@/lib/api-client';
import { fetchCached } from '@/lib/cache';
import type { GradeTrackerDoc } from '@/lib/grades/types';

export const gradeTrackerKey = (id: string) => `grades:tracker:${id}`;

export function fetchGradeTracker(id: string, force = false): Promise<GradeTrackerDoc | null> {
  return fetchCached(
    gradeTrackerKey(id),
    60_000,
    async () => {
      const response = await apiFetch<{ success: boolean; tracker: GradeTrackerDoc | null }>(
        `/api/grade-tracker/${id}`
      );
      if (!response.success) throw new Error('Could not load grade tracker');
      return response.tracker;
    },
    force
  );
}
