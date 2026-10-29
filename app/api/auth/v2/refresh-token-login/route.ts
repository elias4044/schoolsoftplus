import { NextRequest, NextResponse } from 'next/server';

import {
  applyAuthV2Cookies,
  AuthV2Error,
  refreshAuthV2Session,
  syncPasskeyRefreshToken,
} from '@/app/api/auth/v2/lib';
import { recordLogin } from '@/app/api/lib/loginStats';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { trackLoginEvent } from '@/app/api/lib/statsHelper';

export const POST = withValidation(async function POST(req: NextRequest) {
  const body = (await readRouteBody(req)) as {
    school?: string;
    refreshToken?: string;
    orgid?: string;
  };

  const school = body.school?.trim() ?? '';
  const refreshToken = body.refreshToken?.trim() ?? '';
  const orgid = body.orgid?.trim() || '18';

  if (!school || !refreshToken) {
    return NextResponse.json(
      { success: false, error: 'School and refresh token are required.' },
      { status: 400 }
    );
  }

  try {
    const session = await refreshAuthV2Session({
      school,
      refreshToken,
      orgid,
      requireBrowserSession: true,
    });

    const { ensureAccountMigration } = await import('@/app/api/lib/accountMigration');
    await ensureAccountMigration({
      userId: session.userId,
      username: session.username,
      school: session.school,
    });
    await recordLogin(session.userId, session.school, 'authv2').catch(() =>
      console.error('[login] Statistics update failed')
    );
    trackLoginEvent(session.school);
    await syncPasskeyRefreshToken(session.userId, session.school, session.refreshToken);

    const res = NextResponse.json({
      success: true,
      username: session.username,
      expiresAt: session.ssTokenExpiresAt,
    });

    applyAuthV2Cookies(res, session);
    return res;
  } catch (error) {
    if (error instanceof AuthV2Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[auth/v2/refresh-token-login] error:', (error as Error).message);
    return NextResponse.json(
      { success: false, error: 'Could not complete refresh token login.' },
      { status: 500 }
    );
  }
});
