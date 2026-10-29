import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';

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
  try {
    const [subjectRes, examinationsRes, submissionsRes, assignmentsRes] = await Promise.all([
      api.get(`/rest-api/student/ps/subjectroom/${id}`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      }),
      api.get(`/rest-api/student/ps/assignments/examinations?activityId=${id}`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      }),
      api.get(`/rest-api/student/ps/assignments/submissions?activityId=${id}`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      }),
      api.get(`/rest-api/student/ps/subjectroom/${id}/table/rows`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      }),
    ]);

    return NextResponse.json({
      success: true,
      subject: subjectRes.data,
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
