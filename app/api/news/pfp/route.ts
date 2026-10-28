import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '../../lib/apiError';
import { authUser } from '../../lib/auth';
import { createSchoolsoftClient, requireSession } from '../../lib/schoolsoft';

// /api/news/id={ID} ID = teacher's id
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  if (!(await authUser(cookies, school))) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get('/jsp/student/pictureFile.jsp?teacherId=' + id, {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
    });

    const contentType = String(response.headers['content-type'] ?? 'image/jpeg');
    const cacheControl = String(response.headers['cache-control'] ?? 'public, max-age=3600');

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (err) {
    handleApiError(err, 'news_pfp');
  }
}
