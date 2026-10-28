import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { authUser } from '@/app/api/lib/auth';
import {
  applySessionCookieUpdates,
  createSchoolsoftClient,
  requireSession,
} from '@/app/api/lib/schoolsoft';

// GET /api/subjects/results_all
// Returns all available results
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  const authOk = await authUser(cookies, school);
  if (!authOk) {
    const res = NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
    applySessionCookieUpdates(res, sess.cookieUpdates ?? null);
    return res;
  }

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
}
