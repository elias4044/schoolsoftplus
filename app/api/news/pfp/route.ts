import { NextRequest, NextResponse } from 'next/server';

import { withValidation } from '@/app/api/lib/routeValidation';

import { handleApiError } from '../../lib/apiError';
import { createSchoolsoftClient, requireSession } from '../../lib/schoolsoft';

// /api/news/id={ID} ID = teacher's id
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id || !/^\d+$/.test(id))
    return NextResponse.json({ error: 'Invalid teacher id.' }, { status: 400 });

  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get('/jsp/student/pictureFile.jsp?teacherId=' + id, {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
    });

    const contentType = String(response.headers['content-type'] ?? 'image/jpeg');
    const cacheControl = String(response.headers['cache-control'] ?? 'private, no-store');

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (err) {
    return handleApiError(err, 'news_pfp');
  }
});
