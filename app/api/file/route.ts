import { NextRequest, NextResponse } from 'next/server';

import { assertDocumentId, InputError, withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';

export const runtime = 'nodejs';

export const GET = withValidation(async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  assertDocumentId(id);
  const session = await requireSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  if (!session.token) return NextResponse.json({ error: 'AuthV2 is required.' }, { status: 401 });

  const resource = await createSchoolsoftClient(session.school).get(
    `/eva/api/v1/resource/attachment/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${session.token}` },
      validateStatus: () => true,
    }
  );
  if (resource.status === 404)
    return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
  if (resource.status !== 303 || typeof resource.headers.location !== 'string')
    throw new InputError('Invalid file response from SchoolSoft', 502);
  const location = new URL(resource.headers.location, 'https://sms.schoolsoft.se');
  if (location.protocol !== 'https:' || location.username || location.password) {
    throw new InputError('Invalid file destination', 502);
  }
  if (req.nextUrl.searchParams.get('responseType') === 'url')
    return NextResponse.json({ url: location.href });

  // Only the same SchoolSoft origin can receive its bearer token.
  const download = await fetch(location.href, {
    signal: AbortSignal.timeout(10_000),
    redirect: 'error',
    headers:
      location.origin === 'https://sms.schoolsoft.se' &&
      location.pathname.startsWith(`/${session.school}/`)
        ? { Authorization: `Bearer ${session.token}` }
        : {},
  });
  if (!download.ok || !download.body) throw new InputError('File download failed', 502);
  const contentType = download.headers.get('content-type') ?? 'application/octet-stream';
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'",
  };
  if (!/^image\/(jpeg|png|gif|webp|avif|bmp)(?:;|$)/i.test(contentType))
    headers['Content-Disposition'] = 'attachment';
  return new NextResponse(download.body, { headers });
});
