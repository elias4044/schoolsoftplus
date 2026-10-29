import { NextRequest, NextResponse } from 'next/server';

import {
  getFriends,
  getFriendship,
  getPendingRequestsReceived,
  getPendingRequestsSent,
  sendFriendRequest,
} from '@/app/api/lib/friendsDb';
import { getProfile } from '@/app/api/lib/profileDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

// GET /api/friends  — friends list + pending requests
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const [friends, received, sent] = await Promise.all([
    getFriends(userId),
    getPendingRequestsReceived(userId),
    getPendingRequestsSent(userId),
  ]);

  // Enrich with display names from profiles
  const allUsernames = new Set<string>();
  for (const f of friends) {
    allUsernames.add(f.userAId === userId ? f.userBId : f.userAId);
  }
  for (const f of received) {
    allUsernames.add(f.requestedById);
  }
  for (const f of sent) {
    const other = f.userAId === userId ? f.userBId : f.userAId;
    allUsernames.add(other);
  }

  const profileMap: Record<string, { displayName: string; pfpUrl: string; schoolName: string }> =
    {};
  await Promise.all(
    [...allUsernames].map(async (u) => {
      const p = await getProfile(u);
      if (p) {
        profileMap[u] = {
          displayName: p.displayName || `${p.firstName} ${p.lastName}`.trim() || u,
          pfpUrl: p.pfpUrl ?? '',
          schoolName: p.schoolName ?? '',
        };
      }
    })
  );

  return NextResponse.json({ success: true, friends, received, sent, profileMap });
});

// POST /api/friends  — send a friend request
// Body: { targetUsername: string }
export const POST = withValidation(async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const body = (await readRouteBody(req)) as { targetUsername?: string };

  const target = (body.targetUsername ?? '').trim();
  if (!target || target === userId) {
    return NextResponse.json({ success: false, error: 'Invalid target user.' }, { status: 400 });
  }

  // Make sure the target profile exists
  const targetProfile = await getProfile(target);
  if (!targetProfile) {
    return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
  }

  try {
    const friendship = await sendFriendRequest(userId, target);
    return NextResponse.json({ success: true, friendship });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
});

// DELETE /api/friends  — unfriend (body: { targetUsername })
export const DELETE = withValidation(async function DELETE(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const body = (await readRouteBody(req)) as { targetUsername?: string };

  const target = (body.targetUsername ?? '').trim();
  if (!target)
    return NextResponse.json({ success: false, error: 'Invalid target.' }, { status: 400 });

  const { removeFriend } = await import('@/app/api/lib/friendsDb');
  await removeFriend(userId, target);
  return NextResponse.json({ success: true });
});

// PATCH /api/friends — respond to a friend request
// Body: { fromUsername: string, accept: boolean }
export const PATCH = withValidation(async function PATCH(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const body = (await readRouteBody(req)) as { fromUsername?: string; accept?: boolean };

  const from = (body.fromUsername ?? '').trim();
  if (!from)
    return NextResponse.json({ success: false, error: 'Missing fromUsername.' }, { status: 400 });

  const { respondToFriendRequest } = await import('@/app/api/lib/friendsDb');
  const friendship = await respondToFriendRequest(userId, from, body.accept !== false);
  if (!friendship)
    return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });

  // If checking status only
  const existing = await getFriendship(userId, from);
  return NextResponse.json({ success: true, friendship: friendship ?? existing });
});
