import { NextRequest, NextResponse } from 'next/server';

import { resolveAccountReference } from '@/app/api/lib/accountRegistry';
import type { UserStatus } from '@/app/api/lib/presenceDb';
import { computeStatus, getPresenceForUsers, updatePresence } from '@/app/api/lib/presenceDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { applySessionCookieUpdates, requireSession } from '@/app/api/lib/schoolsoft';

const MAX_USERS_PER_REQUEST = 100;
export const maxDuration = 20;

export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { cookieString, school } = sess;

  const rawUsers = req.nextUrl.searchParams.get('users') ?? '';
  const userIds = [
    ...new Set(
      rawUsers
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_USERS_PER_REQUEST);

  if (userIds.length === 0) {
    return NextResponse.json({ success: true, presences: {} });
  }

  const resolvedIds = await Promise.all(userIds.map(resolveAccountReference));
  const records = await getPresenceForUsers(resolvedIds);
  const presences = Object.fromEntries(
    userIds.map((userId, index) => {
      const record = records[resolvedIds[index]] ?? null;
      return [userId, computeStatus(record)];
    })
  );

  const response = NextResponse.json({ success: true, presences });
  applySessionCookieUpdates(response, sess.cookieUpdates);
  return response;
});

// PATCH /api/presence  — update my own presence
// Body: { status: "online" | "idle" | "offline" }
export const PATCH = withValidation(async function PATCH(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { cookieString, school, userId } = sess;
  if (!userId)
    return NextResponse.json({ success: false, error: 'Missing userId.' }, { status: 401 });

  const body = (await readRouteBody(req)) as { status?: string };

  const status = ['online', 'idle', 'offline'].includes(body.status ?? '')
    ? (body.status as UserStatus)
    : 'online';
  await updatePresence(userId, status);
  const response = NextResponse.json({ success: true, status });
  applySessionCookieUpdates(response, sess.cookieUpdates);
  return response;
});
