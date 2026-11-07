import { isAxiosError } from 'axios';

import type {
  HolisticSubject,
  SubjectAssessmentLink,
  SubjectResource,
  SubjectResult,
} from '@/lib/subjects/types';

import { createSchoolsoftClient } from './schoolsoft';
import { cachedSchoolsoftGet, forgetSchoolsoftRead } from './schoolsoftReadCache';
import { fetchAssessmentResource } from './subjectAssessment';
import { cleanSubjectHtml } from './subjectHtml';

type SchoolsoftClient = ReturnType<typeof createSchoolsoftClient>;

function normalizedSubjectName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv-SE');
}

export async function fetchHolisticSubjects(
  api: SchoolsoftClient,
  cookies: string,
  force = false
): Promise<SubjectResource<HolisticSubject[]>> {
  const invalid = () => {
    forgetSchoolsoftRead(api, cookies, '/rest-api/student/holistic_assessment/rows');
    return { status: 'error' as const, data: null };
  };
  try {
    const { data } = await cachedSchoolsoftGet(
      api,
      cookies,
      '/rest-api/student/holistic_assessment/rows',
      { maxAge: 120_000, force }
    );
    if (!Array.isArray(data)) return invalid();
    const subjects: HolisticSubject[] = [];
    for (const row of data) {
      if (
        !row ||
        !Number.isSafeInteger(row.holisticAssessmentId) ||
        typeof row.title !== 'string'
      ) {
        return invalid();
      }
      if (row.holisticAssessmentId <= 0) continue;
      const text = (key: string) => (typeof row[key] === 'string' ? row[key] : '');
      const published = row.published === true;
      subjects.push({
        holisticAssessmentId: row.holisticAssessmentId,
        title: row.title,
        subTitle: published ? text('subTitle') : '',
        status: {
          name: typeof row.status?.name === 'string' ? row.status.name : '',
          isOngoing: row.status?.isOngoing === true,
        },
        published,
        read: row.read === true,
        subjectWarning: published && row.subjectWarning === true,
        subjectWarningComment: published ? cleanSubjectHtml(text('subjectWarningComment')) : '',
        studentKnowledgeDevelopment: published ? text('studentKnowledgeDevelopment') : '',
        formativeAssessment: published ? cleanSubjectHtml(text('formativeAssessment')) : '',
        publishedAt: published ? text('publishedAt') : '',
        updatedAt: published ? text('updatedAt') : '',
      });
    }
    return { status: 'available', data: subjects };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) throw error;
    const status = isAxiosError(error) ? error.response?.status : undefined;
    return { status: status === 403 || status === 404 ? 'unavailable' : 'error', data: null };
  }
}

export async function resolveSubjectAssessment(
  api: SchoolsoftClient,
  cookies: string,
  room: { id: string; subject: string; assignmentIds: number[] },
  rows: SubjectResource<HolisticSubject[]>,
  force = false
): Promise<SubjectAssessmentLink> {
  if (rows.status !== 'available') return { status: rows.status, subject: null };
  const candidates = [...new Map(rows.data.map((row) => [row.holisticAssessmentId, row])).values()];
  const nameMatches = candidates.filter(
    (row) => normalizedSubjectName(row.title) === normalizedSubjectName(room.subject)
  );
  if (nameMatches.length === 1) return { status: 'matched', subject: nameMatches[0] };

  // Shared assignment/activity IDs are evidence when names differ or repeat.
  const queue = [...(nameMatches.length > 0 ? nameMatches : candidates)];
  const matches: HolisticSubject[] = [];
  const assignmentIds = new Set(room.assignmentIds);
  let failed = false;
  let unavailable = false;
  const worker = async () => {
    for (let candidate = queue.shift(); candidate; candidate = queue.shift()) {
      const resource = await fetchAssessmentResource<SubjectResult[]>(
        api,
        cookies,
        String(candidate.holisticAssessmentId),
        'results',
        force
      );
      if (resource.status === 'error') failed = true;
      if (resource.status === 'unavailable') unavailable = true;
      if (
        resource.data?.some(
          (result) => String(result.activityId) === room.id || assignmentIds.has(result.id)
        )
      ) {
        matches.push(candidate);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
  if (matches.length > 1) return { status: 'ambiguous', subject: null };
  if (failed) return { status: 'error', subject: null };
  if (unavailable) return { status: 'unavailable', subject: null };
  if (matches.length === 1) return { status: 'matched', subject: matches[0] };
  return { status: nameMatches.length > 1 ? 'ambiguous' : 'unmatched', subject: null };
}
