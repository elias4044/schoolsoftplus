import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { withValidation } from '@/app/api/lib/routeValidation';
import {
  applySessionCookieUpdates,
  createSchoolsoftClient,
  requireSession,
} from '@/app/api/lib/schoolsoft';

// GET /api/subjects/results_all
// Returns all available results
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  const api = createSchoolsoftClient(school);

  try {
    const { data } = await api.get('/rest-api/student/ps/subjectroom/results/grid/rows', {
      headers: { Cookie: cookies },
      responseType: 'json',
    });

    const res = NextResponse.json({ success: true, rows: data });
    applySessionCookieUpdates(res, sess.cookieUpdates ?? null);
    return res;
  } catch (error) {
    const errRes = handleApiError(error, 'subjects');
    applySessionCookieUpdates(errRes as NextResponse, sess?.cookieUpdates ?? null);
    return errRes;
  }
});
