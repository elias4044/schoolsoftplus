import { NextRequest, NextResponse } from 'next/server';

import { getUserIdByCode } from '@/app/api/lib/referralDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';

/**
 * POST /api/referrals/set-ref
 * Sets an httpOnly referral cookie so the login route can credit
 * the referrer when this visitor creates their first session.
 *
 * Body: { code: string }
 */
export const POST = withValidation(async function POST(req: NextRequest) {
  const body = (await readRouteBody(req)) as { code?: string };

  const code = typeof body.code === 'string' ? body.code.toUpperCase().trim() : '';
  if (!code || !/^[A-Z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ success: false, error: 'Invalid code.' }, { status: 400 });
  }

  // Verify the code actually exists before setting the cookie
  const owner = await getUserIdByCode(code);
  if (!owner) {
    return NextResponse.json({ success: false, error: 'Code not found.' }, { status: 404 });
  }

  const res = NextResponse.json({ success: true });
  // 30-day httpOnly cookie — cleared by the login route after use
  res.cookies.set('ssp_ref', code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
});
