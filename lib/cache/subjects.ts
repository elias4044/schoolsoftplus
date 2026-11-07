import { apiFetch } from '@/lib/api-client';
import { fetchCached, readCache } from '@/lib/cache';
import type {
  HolisticSubject,
  SubjectAssessment,
  SubjectAssessmentLink,
  SubjectResource,
} from '@/lib/subjects/types';

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

export function fetchSubjects(force = false): Promise<Subject[]> {
  return fetchCached(
    SUBJECTS_KEY,
    60_000,
    async () => {
      const d = await apiFetch<{ success: boolean; subjects: Subject[] }>('/api/subjects', {
        priority: 'high',
        params: { view: 'catalog', refresh: force ? '1' : undefined },
      });
      if (!d?.success || !Array.isArray(d.subjects)) throw new Error('Invalid subjects response');
      return d.subjects;
    },
    force
  );
}

export function fetchSubjectDirectory(force = false): Promise<Subject[]> {
  return fetchCached(
    'subjects:directory',
    60_000,
    async () => {
      const data = await apiFetch<{ success: boolean; subjects: Subject[] }>('/api/subjects', {
        priority: 'low',
        params: { view: 'directory', refresh: force ? '1' : undefined },
      });
      if (!data.success || !Array.isArray(data.subjects))
        throw new Error('Invalid subjects response');
      return data.subjects;
    },
    force
  );
}

export function fetchSubjectAssignments(
  id: string | number,
  force = false
): Promise<DetailAssignment[]> {
  const key = subjectDetailKey(id);
  return fetchCached(
    key,
    60_000,
    async () => {
      const d = await apiFetch<{ success: boolean; assignments: DetailAssignment[] }>(
        `/api/subjects/${id}`,
        { priority: 'low', params: { view: 'assignments', refresh: force ? '1' : undefined } }
      );
      if (!d?.success || !Array.isArray(d.assignments)) throw new Error('Invalid subject response');
      return d.assignments;
    },
    force
  );
}

export interface SubjectCoursework {
  success: boolean;
  subject: { subject: string; color?: string; groupNames?: string[] };
  assignments: (DetailAssignment & {
    resultReportStatus: string;
    submissionStatus: string;
    read?: boolean;
  })[];
}

export interface SubjectLinkResponse {
  success: boolean;
  subject: { holisticAssessmentId?: number | null };
  assessmentLink: SubjectAssessmentLink['status'];
  assessmentSummary: HolisticSubject | null;
}

export const subjectCourseworkKey = (id: string) => `subjects:coursework:${id}`;
export const subjectLinkKey = (id: string) => `subjects:link:${id}`;

export function fetchSubjectCoursework(id: string, force = false): Promise<SubjectCoursework> {
  return fetchCached(
    subjectCourseworkKey(id),
    60_000,
    async () => {
      const data = await apiFetch<SubjectCoursework>(`/api/subjects/${id}`, {
        priority: 'high',
        params: { view: 'coursework', refresh: force ? '1' : undefined },
      });
      if (!data.success || !Array.isArray(data.assignments))
        throw new Error('Invalid coursework response');
      return data;
    },
    force
  );
}

export function fetchSubjectLink(id: string, force = false): Promise<SubjectLinkResponse> {
  return fetchCached(
    subjectLinkKey(id),
    120_000,
    async () => {
      const data = await apiFetch<SubjectLinkResponse>(`/api/subjects/${id}`, {
        priority: 'low',
        params: { view: 'assessment-link', refresh: force ? '1' : undefined },
      });
      if (!data.success) throw new Error('Invalid subject link');
      if (data.assessmentLink === 'error') throw new Error('Subject discovery failed');
      return data;
    },
    force
  );
}

export function fetchSubjectSection<K extends keyof SubjectAssessment>(
  id: string,
  holisticId: number,
  section: K,
  force = false
): Promise<SubjectAssessment[K]> {
  const key = `subjects:section:${id}:${holisticId}:${section}`;
  return fetchCached(
    key,
    120_000,
    async () => {
      const data = await apiFetch<{ success: boolean; resource: SubjectResource<unknown> }>(
        `/api/subjects/${id}/assessment`,
        { priority: 'low', params: { holisticId, section, refresh: force ? '1' : undefined } }
      );
      if (!data.success || data.resource.status === 'error')
        throw new Error('Subject section failed');
      return data.resource as SubjectAssessment[K];
    },
    force
  );
}

export function fetchCompleted(force = false): Promise<CompletedRow[]> {
  return fetchCached(
    COMPLETED_KEY,
    60_000,
    async () => {
      const d = await apiFetch<{ success: boolean; rows: CompletedRow[] }>(
        '/api/subjects/results_all'
      );
      if (!d?.success || !Array.isArray(d.rows)) throw new Error('Invalid completed response');
      return d.rows;
    },
    force
  );
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
