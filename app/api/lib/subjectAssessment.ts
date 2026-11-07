import { isAxiosError } from 'axios';

import type { SubjectAssessment, SubjectResource } from '@/lib/subjects/types';

import { createSchoolsoftClient } from './schoolsoft';
import { cachedSchoolsoftGet, forgetSchoolsoftRead } from './schoolsoftReadCache';
import { cleanSubjectHtml } from './subjectHtml';

export const assessmentPaths = {
  attendance: '/attendance/type/CURRENT_SCHOOL_YEAR?fromDate=&toDate=',
  results: '/assessed_assignments',
  criteria: '/matrix',
  criteriaOverview: '/matrix/criteria/overview',
  warning: '/subject_warning',
} as const;

export async function fetchAssessmentResource<T>(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  holisticId: string,
  resource: keyof typeof assessmentPaths,
  force = false
): Promise<SubjectResource<T>> {
  const path = `/rest-api/student/holistic_assessment/${holisticId}${assessmentPaths[resource]}`;
  const invalid = () => {
    forgetSchoolsoftRead(api, cookies, path);
    return { status: 'error' as const, data: null };
  };
  try {
    const response = await cachedSchoolsoftGet<Record<string, unknown> | string | null>(
      api,
      cookies,
      path,
      { maxAge: 120_000, force }
    );
    if (response.data == null || response.data === '') {
      return { status: 'unavailable', data: null };
    }
    // A login redirect can return HTML with a successful HTTP status.
    if (typeof response.data !== 'object') return invalid();
    const data = response.data;
    if (resource === 'warning') {
      if (
        data.holisticAssessmentId !== Number(holisticId) ||
        typeof data.active !== 'boolean' ||
        typeof data.published !== 'boolean'
      )
        return invalid();
      if (!data.active || !data.published) return { status: 'unavailable', data: null };
      if (typeof data.comment !== 'string') return invalid();
      data.comment = cleanSubjectHtml(data.comment);
      for (const field of [
        'lastUpdatedBy',
        'lastUpdatedAt',
        'createdAt',
        'publishedAt',
        'publishedAtDateString',
        'updatedAtDateString',
      ])
        data[field] = typeof data[field] === 'string' ? data[field] : '';
    } else if (resource === 'results') {
      if (!Array.isArray(data)) return invalid();
      for (const result of data) {
        if (
          !result ||
          !Number.isSafeInteger(result.id) ||
          !Number.isSafeInteger(result.activityId) ||
          typeof result.name !== 'string'
        )
          return invalid();
        result.formativeComment = cleanSubjectHtml(
          typeof result.formativeComment === 'string' ? result.formativeComment : ''
        );
        result.assessedCriteria = Array.isArray(result.assessedCriteria)
          ? result.assessedCriteria.filter(
              (item: { level?: unknown }) => item && typeof item.level === 'string'
            )
          : [];
        result.review = typeof result.review === 'string' ? result.review : '';
        result.points = typeof result.points === 'string' ? result.points : '';
      }
    } else if (resource === 'criteria') {
      if (!Array.isArray(data.gradeCriteria)) return invalid();
      for (const criterion of data.gradeCriteria) {
        if (
          !criterion ||
          typeof criterion.name !== 'string' ||
          !Array.isArray(criterion.gradeCriteriaSteps)
        )
          return invalid();
        for (const step of criterion.gradeCriteriaSteps) {
          if (
            !step ||
            typeof step.text !== 'string' ||
            !step.level ||
            typeof step.level.level !== 'string'
          )
            return invalid();
          step.text = cleanSubjectHtml(step.text);
        }
      }
    } else if (resource === 'criteriaOverview') {
      if (
        !Array.isArray(data.gradeCriteriaOverview) ||
        data.gradeCriteriaOverview.some(
          (item: { name?: unknown; level?: unknown }) =>
            !item || typeof item.name !== 'string' || typeof item.level !== 'string'
        )
      )
        return invalid();
    } else if (
      ![data.lessons, data.attendance, data.absence, data.reportedAbsence].every(
        (value) => typeof value === 'number' && Number.isFinite(value)
      )
    ) {
      return invalid();
    }
    return { status: 'available', data: data as T };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) throw error;
    const status = isAxiosError(error) ? error.response?.status : undefined;
    return {
      status:
        resource === 'warning' || status === 403 || status === 404 || status === 204
          ? 'unavailable'
          : 'error',
      data: null,
    };
  }
}

export async function fetchSubjectAssessment(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  holisticId: string,
  force = false
): Promise<SubjectAssessment> {
  const [attendance, results, criteria, criteriaOverview, warning] = await Promise.all([
    fetchAssessmentResource<NonNullable<SubjectAssessment['attendance']['data']>>(
      api,
      cookies,
      holisticId,
      'attendance',
      force
    ),
    fetchAssessmentResource<NonNullable<SubjectAssessment['results']['data']>>(
      api,
      cookies,
      holisticId,
      'results',
      force
    ),
    fetchAssessmentResource<NonNullable<SubjectAssessment['criteria']['data']>>(
      api,
      cookies,
      holisticId,
      'criteria',
      force
    ),
    fetchAssessmentResource<NonNullable<SubjectAssessment['criteriaOverview']['data']>>(
      api,
      cookies,
      holisticId,
      'criteriaOverview',
      force
    ),
    fetchAssessmentResource<NonNullable<SubjectAssessment['warning']['data']>>(
      api,
      cookies,
      holisticId,
      'warning',
      force
    ),
  ]);
  return { attendance, results, criteria, criteriaOverview, warning };
}
