import { NextRequest, NextResponse } from 'next/server';

import { areFriends } from '@/app/api/lib/friendsDb';
import {
  createGroupChat,
  findOrCreateDM,
  getConversationsForUser,
} from '@/app/api/lib/messagingDb';
import { getProfile } from '@/app/api/lib/profileDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';
import { trackConversationCreated } from '@/app/api/lib/statsHelper';

// GET /api/conversations  – list all conversations for the current user
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const conversations = await getConversationsForUser(userId);
  return NextResponse.json({ success: true, conversations });
});

// POST /api/conversations
//   DM:    { type?: "dm", targetUsername: string }
//   Group: { type: "group", groupName: string, groupDescription?: string, members: string[] }
export const POST = withValidation(async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId } = sess;

  const body = (await readRouteBody(req)) as {
    type?: string;
    targetUsername?: string;
    groupName?: string;
    groupDescription?: string;
    encrypted?: boolean;
    members?: string[];
  };

  /* ── Group chat ───────────────────────────────────────── */
  if (body.type === 'group') {
    const groupName = (body.groupName ?? '').trim();
    if (!groupName)
      return NextResponse.json(
        { success: false, error: 'Group name is required.' },
        { status: 400 }
      );

    const memberUsernames: string[] = [...new Set(body.members ?? [])]
      .map((u: string) => u.trim())
      .filter((u: string) => u && u !== userId)
      .slice(0, 49); // max 50 participantIds incl. creator

    if (memberUsernames.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Add at least one other member.' },
        { status: 400 }
      );
    }

    // Fetch all display names in parallel
    const [myProfile, ...memberProfiles] = await Promise.all([
      getProfile(userId),
      ...memberUsernames.map((u) => getProfile(u)),
    ]);

    const myDisplayName =
      myProfile?.displayName ||
      `${myProfile?.firstName ?? ''} ${myProfile?.lastName ?? ''}`.trim() ||
      userId;

    if (memberProfiles.some((profile) => !profile))
      return NextResponse.json({ error: 'One or more members were not found.' }, { status: 404 });

    const members = memberUsernames.map((u, i) => {
      const p = memberProfiles[i];
      return {
        userId: u,
        displayName: p?.displayName || `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || u,
        pfpUrl: p?.pfpUrl ?? '',
      };
    });

    const conversation = await createGroupChat({
      creatorUserId: userId,
      creatorDisplayName: myDisplayName,
      creatorPfpUrl: myProfile?.pfpUrl ?? '',
      groupName,
      groupDescription: body.groupDescription,
      encrypted: body.encrypted === true,
      members,
    });

    trackConversationCreated();
    return NextResponse.json({ success: true, conversation });
  }

  /* ── DM ───────────────────────────────────────────────── */
  const targetUsername = (body.targetUsername ?? '').trim();
  if (!targetUsername || targetUsername === userId) {
    return NextResponse.json({ success: false, error: 'Invalid target user.' }, { status: 400 });
  }

  const [myProfile, theirProfile] = await Promise.all([
    getProfile(userId),
    getProfile(targetUsername),
  ]);

  const myDisplayName =
    myProfile?.displayName ||
    `${myProfile?.firstName ?? ''} ${myProfile?.lastName ?? ''}`.trim() ||
    userId;

  const theirDisplayName =
    theirProfile?.displayName ||
    `${theirProfile?.firstName ?? ''} ${theirProfile?.lastName ?? ''}`.trim() ||
    targetUsername;

  if (!theirProfile) {
    return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
  }

  // Check if a DM already exists — if so, allow opening it regardless of friend status
  const { db } = await import('@/app/api/lib/firebaseAdmin');
  const participantIds = [userId, targetUsername].sort();
  const existingSnap = await db
    .collection('conversations_v1')
    .where('participantIds', '==', participantIds)
    .where('type', '==', 'dm')
    .limit(1)
    .get();

  if (existingSnap.empty) {
    // New DM: require friendship
    const friends = await areFriends(userId, targetUsername);
    if (!friends) {
      return NextResponse.json(
        {
          success: false,
          error:
            'You must be friends to start a new direct message. Send them a friend request first.',
          needsFriend: true,
        },
        { status: 403 }
      );
    }
  }

  const { conversation, created } = await findOrCreateDM(
    userId,
    myDisplayName,
    targetUsername,
    theirDisplayName,
    myProfile?.pfpUrl ?? '',
    theirProfile?.pfpUrl ?? ''
  );
  if (created) trackConversationCreated();
  return NextResponse.json({ success: true, conversation });
});
