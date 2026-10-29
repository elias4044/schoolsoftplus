import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';
import { trackAssignmentsFetch } from '@/app/api/lib/statsHelper';

// -- GET /api/assignments/week?week=xx&year=xxxx  ------------------------------
export const GET = withValidation(async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');
  const year = searchParams.get('year');

  if (!week || !year) {
    return NextResponse.json(
      { success: false, error: 'week and year query parameters are required.' },
      { status: 400 }
    );
  }

  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }
  const { cookieString: cookies, school } = sess;

  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get(
      `/rest-api/student/ps/assignments/start-page?week=${week}&year=${year}`,
      { headers: { Cookie: cookies }, responseType: 'json' }
    );
    trackAssignmentsFetch();
    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    return handleApiError(error, 'weekAssignments');
  }
});
