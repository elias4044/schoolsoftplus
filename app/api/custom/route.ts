import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';

// -- ANY /api/custom  ----------------------------------------------------------
// Proxies an arbitrary path on the SchoolSoft API.
// Pass the path in the `x-url` header (e.g. "rest-api/student/ps/something").
export const GET = withValidation(async function GET(req: NextRequest) {
  return proxyRequest(req, 'GET');
});
export const POST = withValidation(async function POST(req: NextRequest) {
  return proxyRequest(req, 'POST');
});
export const PUT = withValidation(async function PUT(req: NextRequest) {
  return proxyRequest(req, 'PUT');
});
export const DELETE = withValidation(async function DELETE(req: NextRequest) {
  return proxyRequest(req, 'DELETE');
});

async function proxyRequest(req: NextRequest, method: string): Promise<NextResponse> {
  const customURL = req.headers.get('x-url');

  if (!customURL) {
    return NextResponse.json(
      { success: false, error: 'x-url header is required.' },
      { status: 400 }
    );
  }

  if (
    !/^(?:rest-api|eva\/api)\/[A-Za-z0-9_/?=&%.,:+~-]+$/.test(customURL) ||
    /(?:^|\/|%2f)(?:\.\.|%2e)/i.test(customURL) ||
    customURL.includes('://') ||
    /%0[ad]/i.test(customURL)
  ) {
    return NextResponse.json({ error: 'Invalid SchoolSoft API path.' }, { status: 400 });
  }
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  const api = createSchoolsoftClient(school);

  try {
    const body = method === 'GET' || !req.body ? undefined : await readRouteBody(req);

    const response = await api.request({
      method,
      url: `/${customURL}`,
      headers: { Cookie: cookies },
      data: body,
      responseType: 'json',
    });

    return NextResponse.json({ success: true, data: response.data }, { status: response.status });
  } catch (error) {
    return handleApiError(error, 'custom');
  }
}
