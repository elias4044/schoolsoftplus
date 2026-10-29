import { NextResponse } from 'next/server';
import axios from 'axios';

import { fetchSchoolsoftSession } from '@/app/api/lib/mobileAuth';
import { getPasskeyUser, makeUserHandle, updatePasskeyToken } from '@/app/api/lib/passkeyDb';
import { encrypt } from '@/app/api/lib/serverCrypto';

const CLIENT_ID = 'eApp';

export class AuthV2Error extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AuthV2Error';
    this.status = status;
  }
}

export interface AuthV2SessionData {
  school: string;
  orgid: string;
  username: string;
  userId: string;
  ssToken: string;
  refreshToken: string;
  ssTokenExpiresAt: number;
  jsessionid: string;
  hash: string;
  usertype: string;
}

function extractCookieValue(raw: string): string {
  return raw.split(';')[0].split('=').slice(1).join('=');
}

export async function refreshAuthV2Session({
  school,
  refreshToken,
  orgid = '18',
  usernameHint = '',
  requireBrowserSession = false,
}: {
  school: string;
  refreshToken: string;
  orgid?: string;
  usernameHint?: string;
  requireBrowserSession?: boolean;
}): Promise<AuthV2SessionData> {
  const normalizedSchool = school.trim();
  const normalizedRefreshToken = refreshToken.trim();

  if (!normalizedSchool) {
    throw new AuthV2Error('School is required.', 400);
  }

  if (!normalizedRefreshToken) {
    throw new AuthV2Error('Refresh token is required.', 400);
  }

  const refreshUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(normalizedSchool)}/rest-api/login/token` +
    `?clientId=${encodeURIComponent(CLIENT_ID)}` +
    `&grantType=refresh_token` +
    `&refreshToken=${encodeURIComponent(normalizedRefreshToken)}`;

  let ssToken = '';
  let nextRefreshToken = normalizedRefreshToken;
  let expiresIn = 900;

  try {
    const refreshRes = await fetch(refreshUrl, {
      signal: AbortSignal.timeout(8_000),
      method: 'POST',
      headers: { accept: 'application/json' },
    });

    if (refreshRes.status !== 200) {
      console.warn(`[auth/v2] refresh failed (${refreshRes.status}):`);
      throw new AuthV2Error('Refresh token expired. Please log in again.', 401);
    }

    const data = (await refreshRes.json()) as Record<string, unknown>;
    ssToken = typeof data.access_token === 'string' ? data.access_token : '';
    nextRefreshToken =
      typeof data.refresh_token === 'string' ? data.refresh_token : normalizedRefreshToken;
    expiresIn = typeof data.expires === 'number' ? data.expires : 900;

    if (!ssToken) {
      throw new AuthV2Error('No access token in refresh response.', 401);
    }
  } catch (error) {
    if (error instanceof AuthV2Error) throw error;
    console.error('[auth/v2] network error:', (error as Error).message);
    throw new AuthV2Error('Could not reach SchoolSoft. Try again later.', 502);
  }

  const sessionInfo = await fetchSchoolsoftSession(normalizedSchool, ssToken, orgid);
  if (!sessionInfo) throw new AuthV2Error('Could not verify the refreshed account.', 401);
  const canonicalUsername = sessionInfo.username;
  const userId = sessionInfo?.userId?.toString() ?? '';

  const redirectUrl = `https://sms.schoolsoft.se/${normalizedSchool}/react/#/student/subjectrooms`;
  const sessionUrl = `https://sms.schoolsoft.se/${encodeURIComponent(normalizedSchool)}/eva-apps/auth/login/student`;

  let jsessionid = '';
  let hash = '';
  let usertype = '1';

  try {
    const sessionRes = await axios.get(sessionUrl, {
      timeout: 8_000,
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'nyEva',
        'X-Requested-With': 'com.schoolsoft.eapp.android',
        token: ssToken,
        orgid,
        redirecturl: redirectUrl,
        language: 'sw',
        theme: 'dark',
        useros: 'android',
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie = sessionRes.headers['set-cookie'];
    const rawCookies: string[] = Array.isArray(setCookie)
      ? setCookie
      : setCookie
        ? [setCookie]
        : [];

    const cookieMap: Record<string, string> = {};
    for (const cookie of rawCookies) {
      const name = cookie.split('=')[0]?.trim();
      if (name) cookieMap[name] = extractCookieValue(cookie);
    }

    jsessionid = cookieMap.JSESSIONID ?? '';
    hash = cookieMap.hash ?? '';
    usertype = cookieMap.usertype ?? '1';
  } catch (error) {
    console.error('[auth/v2] eva-apps error:', (error as Error).message);
  }

  if (requireBrowserSession && (!jsessionid || !hash)) {
    throw new AuthV2Error(
      'SchoolSoft did not return a browser session for this refresh token.',
      502
    );
  }

  return {
    school: normalizedSchool,
    orgid,
    username: canonicalUsername,
    userId,
    ssToken,
    refreshToken: nextRefreshToken,
    ssTokenExpiresAt: Math.floor(Date.now() / 1000) + expiresIn,
    jsessionid,
    hash,
    usertype,
  };
}

export function applyAuthV2Cookies(res: NextResponse, session: AuthV2SessionData) {
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };

  if (session.jsessionid && session.hash) {
    res.cookies.set('ssp_jsessionid', session.jsessionid, cookieOpts);
    res.cookies.set('ssp_hash', session.hash, cookieOpts);
    res.cookies.set('ssp_usertype', session.usertype, cookieOpts);
  }

  res.cookies.set('ssp_school', session.school, { ...cookieOpts, httpOnly: false });
  res.cookies.set('ssp_username', session.username, { ...cookieOpts, httpOnly: false });
  res.cookies.set('ssp_userid', session.userId, cookieOpts);
  res.cookies.set('ssp_ss_token', session.ssToken, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  res.cookies.set('ssp_ss_token_expires', String(session.ssTokenExpiresAt), {
    ...cookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set('ssp_ss_refresh_token', session.refreshToken, {
    ...cookieOpts,
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set('ssp_auth_type', 'authv2', {
    ...cookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set('ssp_ss_orgid', session.orgid, {
    ...cookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function syncPasskeyRefreshToken(
  userId: string,
  school: string,
  refreshToken: string
) {
  if (!userId || !school || !refreshToken) return;

  const userHandle = makeUserHandle(userId, school);

  try {
    const record = await getPasskeyUser(userHandle);
    if (!record) return;
    const { ciphertext, iv } = encrypt(refreshToken);
    await updatePasskeyToken(userHandle, ciphertext, iv);
  } catch (error) {
    console.error('[auth/v2] passkey token sync error:', (error as Error).message);
  }
}
