import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';
import { trackLunchFetch } from '@/app/api/lib/statsHelper';

// -- GET /api/lunch?week=xx  ---------------------------------------------------
export const GET = withValidation(async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');

  if (!week) {
    return NextResponse.json(
      { success: false, error: 'week query parameter is required.' },
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
    const response = await api.get(`/rest-api/lunchmenu/week/${week}`, {
      headers: { Cookie: cookies },
      responseType: 'json',
    });
    trackLunchFetch();
    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    return handleApiError(error, 'lunch');
  }
});
