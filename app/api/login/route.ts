import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

import { assertSchool, normalizeUserId } from '@/app/api/lib/identity';
import { recordLogin } from '@/app/api/lib/loginStats';
import { creditReferral, getUserIdByCode } from '@/app/api/lib/referralDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient } from '@/app/api/lib/schoolsoft';
import { trackLoginEvent } from '@/app/api/lib/statsHelper';

export const POST = withValidation(async function POST(req: NextRequest) {
  const body = await readRouteBody(req);
  if (
    typeof body.username !== 'string' ||
    typeof body.password !== 'string' ||
    !body.username ||
    !body.password
  )
    return NextResponse.json(
      { success: false, message: 'Username and password are required.' },
      { status: 400 }
    );
  const school = assertSchool(req.headers.get('x-school') ?? 'engelska');
  const loginUrl = `https://sms.schoolsoft.se/${school}/jsp/Login.jsp`;
  const form = new URLSearchParams({
    action: 'login',
    ssusername: body.username,
    sspassword: body.password,
    usertype: typeof body.usertype === 'string' ? body.usertype : '1',
  });
  const login = await axios.post(loginUrl, form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      Referer: loginUrl,
    },
    timeout: 8_000,
    maxRedirects: 0,
    validateStatus: () => true,
  });
  if (login.status !== 302)
    return NextResponse.json(
      { success: false, message: 'Login failed. Check your credentials.' },
      { status: 401 }
    );
  const cookieMap = new Map<string, string>();
  for (const cookie of login.headers['set-cookie'] ?? []) {
    const pair = cookie.split(';')[0];
    const separator = pair.indexOf('=');
    if (separator > 0) cookieMap.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  const jsessionid = cookieMap.get('JSESSIONID');
  const hash = cookieMap.get('hash');
  if (!jsessionid || !hash)
    return NextResponse.json({ success: false, message: 'Login failed.' }, { status: 401 });
  const usertype = cookieMap.get('usertype') ?? '1';
  const { data } = await createSchoolsoftClient(school).get('/rest-api/session', {
    headers: { Cookie: `JSESSIONID=${jsessionid}; hash=${hash}; usertype=${usertype}` },
    responseType: 'json',
  });
  const userId = normalizeUserId(data?.user?.id);
  if (!userId || typeof data?.user?.userName !== 'string')
    return NextResponse.json(
      { success: false, message: 'Account verification failed.' },
      { status: 401 }
    );
  const { ensureAccountMigration } = await import('@/app/api/lib/accountMigration');
  await ensureAccountMigration({
    userId,
    school,
    username: data.user.userName.toLowerCase().trim(),
  });
  const isNew = await recordLogin(userId, school, 'classic').catch(() => {
    console.error('[login] Statistics update failed');
    return false;
  });
  trackLoginEvent(school);
  const referralCode = req.cookies.get('ssp_ref')?.value;
  if (isNew && referralCode) {
    const referrerId = await getUserIdByCode(referralCode);
    if (referrerId && referrerId !== userId) await creditReferral(referrerId, userId);
  }
  const response = NextResponse.json({ success: true, userId });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 86400,
  };
  response.cookies.set('ssp_jsessionid', jsessionid, options);
  response.cookies.set('ssp_hash', hash, options);
  response.cookies.set('ssp_usertype', usertype, options);
  response.cookies.set('ssp_userid', userId, options);
  response.cookies.set('ssp_ss_orgid', String(data.organization?.id ?? ''), options);
  response.cookies.set('ssp_school', school, { ...options, httpOnly: false });
  response.cookies.set('ssp_username', data.user.userName.toLowerCase(), {
    ...options,
    httpOnly: false,
  });
  for (const name of [
    'ssp_ss_token',
    'ssp_ss_refresh_token',
    'ssp_ss_token_expires',
    'ssp_auth_type',
    'ssp_ref',
  ])
    response.cookies.set(name, '', { ...options, maxAge: 0 });
  return response;
});
