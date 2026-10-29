import { NextRequest, NextResponse } from 'next/server';

import {
  getPendingInvitesForUser,
  respondToGroupInvite,
  sendGroupInvite,
} from '@/app/api/lib/groupInvitesDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

// GET /api/group-invites — list pending group invites for the current user
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const invites = await getPendingInvitesForUser(userId);
  return NextResponse.json({ success: true, invites });
});

// POST /api/group-invites — send an invite (admin only)
// Body: { conversationId: string, targetUsername: string }
export const POST = withValidation(async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const body = (await readRouteBody(req)) as { conversationId?: string; targetUsername?: string };

  const { conversationId, targetUsername } = body;
  if (!conversationId || !targetUsername) {
    return NextResponse.json({ success: false, error: 'Missing fields.' }, { status: 400 });
  }

  const invite = await sendGroupInvite(conversationId, targetUsername.trim(), userId);
  if (!invite) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Could not send invite. Ensure you are the admin and the user is not already a member.',
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true, invite });
});

// PATCH /api/group-invites — respond to an invite
// Body: { inviteId: string, accept: boolean }
export const PATCH = withValidation(async function PATCH(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const body = (await readRouteBody(req)) as { inviteId?: string; accept?: boolean };

  const { inviteId, accept } = body;
  if (!inviteId)
    return NextResponse.json({ success: false, error: 'Missing inviteId.' }, { status: 400 });

  try {
    const result = await respondToGroupInvite(inviteId, userId, accept !== false);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
});
