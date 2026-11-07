import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { InputError, withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';
import { cachedSchoolsoftGet } from '@/app/api/lib/schoolsoftReadCache';
import { fetchHolisticSubjects, resolveSubjectAssessment } from '@/app/api/lib/subjectMapping';

// -- GET /api/subjects/[id]  ---------------------------------------------------
// Returns detailed data for a single subject room.
export const GET = withValidation(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  const api = createSchoolsoftClient(school);
  const view = req.nextUrl.searchParams.get('view');
  if (view && !['coursework', 'assignments', 'assessment-link'].includes(view))
    throw new InputError('Invalid subject view');
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  const get = (path: string) => cachedSchoolsoftGet(api, cookies, path, { maxAge: 60_000, force });
  try {
    if (view === 'assignments') {
      const { data: assignments } = await get(`/rest-api/student/ps/subjectroom/${id}/table/rows`);
      return NextResponse.json({ success: true, assignments });
    }
    const [subjectRes, examinationsRes, submissionsRes, assignmentsRes, holisticRows] =
      await Promise.all([
        get(`/rest-api/student/ps/subjectroom/${id}`),
        view
          ? Promise.resolve({ data: [] })
          : get(`/rest-api/student/ps/assignments/examinations?activityId=${id}`),
        view
          ? Promise.resolve({ data: [] })
          : get(`/rest-api/student/ps/assignments/submissions?activityId=${id}`),
        get(`/rest-api/student/ps/subjectroom/${id}/table/rows`),
        view === 'assessment-link' || req.nextUrl.searchParams.get('includeAssessment') === 'true'
          ? fetchHolisticSubjects(api, cookies, force)
          : null,
      ]);

    const room = subjectRes.data as Record<string, unknown>;
    const assessmentLink = holisticRows
      ? await resolveSubjectAssessment(
          api,
          cookies,
          {
            id,
            subject: String(room.subject ?? ''),
            assignmentIds: Array.isArray(assignmentsRes.data)
              ? assignmentsRes.data
                  .filter((row: { entityType: string }) => row.entityType === 'ASSIGNMENT')
                  .map((row: { id: number }) => row.id)
              : [],
          },
          holisticRows,
          force
        )
      : null;

    return NextResponse.json({
      success: true,
      subject: {
        ...room,
        ...(assessmentLink
          ? { holisticAssessmentId: assessmentLink.subject?.holisticAssessmentId ?? null }
          : {}),
      },
      ...(assessmentLink
        ? { assessmentLink: assessmentLink.status, assessmentSummary: assessmentLink.subject }
        : {}),
      overview: {
        examinations: examinationsRes.data,
        submissions: submissionsRes.data,
      },
      assignments: assignmentsRes.data,
    });
  } catch (error) {
    return handleApiError(error, 'subjectData');
  }
});
