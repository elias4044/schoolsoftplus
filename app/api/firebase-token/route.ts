import { NextRequest, NextResponse } from 'next/server';

import { createFirebaseCustomToken } from '@/app/api/lib/firebaseAdmin';
import { withValidation } from '@/app/api/lib/routeValidation';
import { applySessionCookieUpdates, requireSession } from '@/app/api/lib/schoolsoft';

export const GET = withValidation(async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const token = await createFirebaseCustomToken(session.userId);
  const response = NextResponse.json({ success: true, token, userId: session.userId });
  applySessionCookieUpdates(response, session.cookieUpdates);
  return response;
});
