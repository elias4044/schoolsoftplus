import { NextRequest, NextResponse } from 'next/server';

import {
  exchangeCodeForToken,
  fetchSchoolsoftSession,
  signMobileToken,
} from '@/app/api/lib/mobileAuth';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { trackLoginEvent } from '@/app/api/lib/statsHelper';

/* 
   POST /api/mobile/token
   
   Second step of the browser-based login flow.

   After the user completes manual login in a browser / WebView,
   SchoolSoft redirects to the app's deep-link with the
   authorization code:

     com.yourapp://auth?code=hWuaGr&state=3OxPx2Npca

   The app extracts the code, verifies the state matches what it
   stored, then calls this endpoint to exchange the code for a
   signed JWT.

   Request body (JSON):
     {
       code:     string   – authorization code from the deep-link callback
       verifier: string   – PKCE verifier returned by GET /api/mobile/login
       school?:  string   – school slug (default "engelska")
                            or X-School header
       orgid?:   string   – school org ID (default "18")
     }

   Response (200):
     {
       success:   true,
       token:     string,   ← use as "Authorization: Bearer <token>"
       tokenType: "Bearer",
       expiresIn: 2592000   ← 30 days in seconds
     }
*/
export const POST = withValidation(async function POST(req: NextRequest) {
  const body = (await readRouteBody(req)) as {
    code?: string;
    verifier?: string;
    school?: string;
    orgid?: string;
  };

  const { code, verifier } = body;
  if (!code || !verifier) {
    return NextResponse.json(
      { success: false, error: 'code and verifier are required.' },
      { status: 400 }
    );
  }

  const school = (body.school ?? req.headers.get('x-school') ?? 'engelska').trim();

  /* ── Exchange code + verifier for SchoolSoft token ─────── */
  const tokenResult = await exchangeCodeForToken(school, code, verifier);
  if (!tokenResult) {
    return NextResponse.json(
      { success: false, error: 'Token exchange failed. The code may have expired.' },
      { status: 401 }
    );
  }

  // Extract fields from the raw SchoolSoft response
  const ssToken = tokenResult.access_token as string | undefined;
  const refreshToken = tokenResult.refresh_token as string | undefined;
  const expiresIn = typeof tokenResult.expires === 'number' ? tokenResult.expires : undefined;
  const ssTokenExpiresAt =
    expiresIn != null ? Math.floor(Date.now() / 1000) + expiresIn : undefined;

  if (!ssToken) {
    return NextResponse.json(
      { success: false, error: 'Token exchange failed — no access_token returned.' },
      { status: 401 }
    );
  }

  /* ── Confirm session / get canonical username ───────────── */
  const sessionInfo = await fetchSchoolsoftSession(school, ssToken, body.orgid ?? '18');
  if (!sessionInfo)
    return NextResponse.json({ error: 'Account verification failed.' }, { status: 401 });
  const username = sessionInfo.username;

  /* ── Issue signed JWT ────────────────────────────────────── */
  const token = signMobileToken({
    username,
    school,
    ssToken,
    refreshToken,
    ssTokenExpiresAt,
    userId: sessionInfo?.userId,
  });
  trackLoginEvent(school);

  return NextResponse.json({
    success: true,
    token,
    tokenType: 'Bearer',
    expiresIn: 30 * 24 * 60 * 60,
  });
});
