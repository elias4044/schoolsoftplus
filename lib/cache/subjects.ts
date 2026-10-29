import { apiFetch } from '@/lib/api-client';
import { dedupe, readCache, writeCache } from '@/lib/cache';

export interface Teacher {
  firstName: string;
  lastName: string;
}

export interface Subject {
  id: string | number;
  subject: string;
  teachers: Teacher[];
  unreadEntities?: number;
  color: string;
}

export interface DetailAssignment {
  id: number;
  entityType: string;
  title: string;
  type: string;
  endDate: string;
  endTime?: string;
  status: string;
}

export interface DueItem {
  id: number;
  title: string;
  type: string;
  entityType: string;
  endDate: string;
  endTime?: string;
}

export interface Insight {
  ok: boolean;
  active: number;
  overdue: number;
  upcoming: DueItem[];
}

export interface CompletedRow {
  assignmentId: number;
  activityId: number;
  title: string;
  subjects: { name: string; color?: string }[];
  assignmentType: string;
  teacher?: string;
  teacherPictureUrl?: string;
  publishDate: string; // "YYYY-MM-DD HH:mm"
  read: boolean;
}

export const SUBJECTS_KEY = 'subjects:list';
export const COMPLETED_KEY = 'subjects:completed';
export const subjectDetailKey = (id: string | number) => `subjects:detail:${id}`;

export function daysUntil(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function buildInsight(assignments: DetailAssignment[]): Insight {
  const open = assignments
    .filter(
      (a) => a.entityType === 'ASSIGNMENT' && (a.status === 'ONGOING' || a.status === 'UPCOMING')
    )
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return {
    ok: true,
    active: open.length,
    overdue: open.filter((a) => (daysUntil(a.endDate) ?? 0) < 0).length,
    upcoming: open.slice(0, 2).map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      entityType: a.entityType,
      endDate: a.endDate,
      endTime: a.endTime,
    })),
  };
}

export function fetchSubjects(): Promise<Subject[]> {
  return dedupe(SUBJECTS_KEY, async () => {
    const d = await apiFetch<{ success: boolean; subjects: Subject[] }>('/api/subjects');
    if (!d?.success || !Array.isArray(d.subjects)) throw new Error('Invalid subjects response');
    writeCache(SUBJECTS_KEY, d.subjects);
    return d.subjects;
  });
}

export function fetchSubjectAssignments(id: string | number): Promise<DetailAssignment[]> {
  const key = subjectDetailKey(id);
  return dedupe(key, async () => {
    const d = await apiFetch<{ success: boolean; assignments: DetailAssignment[] }>(
      `/api/subjects/${id}`
    );
    if (!d?.success || !Array.isArray(d.assignments)) throw new Error('Invalid subject response');
    writeCache(key, d.assignments);
    return d.assignments;
  });
}

export function fetchCompleted(): Promise<CompletedRow[]> {
  return dedupe(COMPLETED_KEY, async () => {
    const d = await apiFetch<{ success: boolean; rows: CompletedRow[] }>(
      '/api/subjects/results_all'
    );
    if (!d?.success || !Array.isArray(d.rows)) throw new Error('Invalid completed response');
    writeCache(COMPLETED_KEY, d.rows);
    return d.rows;
  });
}

export function readCachedInsight(id: string | number): Insight | undefined {
  const c = readCache<DetailAssignment[]>(subjectDetailKey(id));
  return c ? buildInsight(c.data) : undefined;
}

/** Subjects tab: the subject list plus every subject's assignments (3 requests at a time). */
export async function prefetchSubjectsPage(concurrency = 3): Promise<void> {
  const subjects = await fetchSubjects();
  const queue = [...subjects];
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      try {
        await fetchSubjectAssignments(s.id);
      } catch {
        /* one failing subject shouldn't stop the rest */
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}

/** Completed tab: all completed assignments. */
export async function prefetchCompletedPage(): Promise<void> {
  await fetchCompleted();
}
