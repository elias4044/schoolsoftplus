export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Get files/images from SchoolSoft. Useful for "news".
import { NextRequest, NextResponse } from 'next/server';
import { createSchoolsoftClient, requireSession } from '../lib/schoolsoft';
import { handleApiError } from '../lib/apiError';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // Not needed, does nothing at the moment (might change in the future)
  const id = searchParams.get('id');
  const responseType = searchParams.get('responseType'); // URL or direct file - "url" for URL, otherwise defaults to direct file.

  if (!id) {
    return NextResponse.json(
      {
        error: "Missing 'id' search parameter",
      },
      { status: 400 }
    );
  }

  const sess = await requireSession(req);

  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  if (!sess.token) {
    return NextResponse.json(
      {
        success: false,
        error:
          'This route requires AuthV2 (https://developer.ssp.elias4044.com/docs/auth-v2). The legacy route is available at /api/news/legacy',
      },
      { status: 401 }
    );
  }

  const api = createSchoolsoftClient(sess.school);

  try {
    let fileType = 'attachment';
    //if (type?.toLowerCase() === "image") fileType = "image";

    const res = await api.get(`/eva/api/v1/resource/${fileType}/${id}`, {
      headers: {
        Authorization: `Bearer ${sess.token}`,
      },
      maxRedirects: 0,
      validateStatus: () => true, // temp for testing
      //validateStatus: (status) => status === 303 || status === 404,
    });
    console.log('SchoolSoft response:', {
      status: res.status,
      location: res.headers.location,
      headers: res.headers,
      data: res.data,
    });

    const headers = res.headers;
    if (res.status !== 303) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      } else {
        throw new Error('Did not recognise SchoolSoft response: ' + JSON.stringify(res.data));
      }
    }

    console.log('SchoolSoft redirect:', {
      now: Date.now(),
      nowISO: new Date().toISOString(),
      location: headers.location,
    });

    if (!headers.location) {
      throw new Error('No location was provided by SchoolSoft');
    }

    if (responseType === 'url') {
      return NextResponse.json({
        url: headers.location,
      });
    }

    const fileRes = await api.get(headers.location, {
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${sess.token}`, // include if SchoolSoft still checks it; harmless if not needed
      },
      validateStatus: () => true,
    });

    if (fileRes.status !== 200) {
      return NextResponse.json(
        { error: 'Upstream fetch failed', status: fileRes.status },
        { status: 502 }
      );
    }

    const contentType =
      typeof fileRes.headers['content-type'] === 'string'
        ? fileRes.headers['content-type']
        : 'application/octet-stream';

    return new NextResponse(fileRes.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err, 'file');
  }
}
