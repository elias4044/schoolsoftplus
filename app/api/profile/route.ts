import { NextRequest, NextResponse } from 'next/server';

import { updateParticipantName, updateParticipantPfp } from '@/app/api/lib/messagingDb';
import { getProfile, upsertProfile } from '@/app/api/lib/profileDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

// -- GET /api/profile  -------------------------------------------------------
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId: username } = sess;
  const profile = await getProfile(username);
  return NextResponse.json({ success: true, profile });
});

// -- PUT /api/profile  -------------------------------------------------------
export const PUT = withValidation(async function PUT(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId: username } = sess;

  const data = sess.sessionData;
  const sessionSnap = {
    loginUsername: sess.username,
    school: sess.school,
    firstName: data.user.firstName ?? '',
    lastName: data.user.lastName ?? '',
    email: data.user.email ?? '',
    schoolName: data.organization?.name ?? '',
    userType: data.userType?.name ?? '',
  };

  const body = (await readRouteBody(req)) as Record<string, unknown>;

  const MAX_LEN: Record<string, number> = {
    displayName: 80,
    bio: 500,
    pronouns: 40,
    location: 80,
    website: 200,
    pfpUrl: 500,
    coverUrl: 500,
    accentColor: 30,
    github: 100,
    twitter: 100,
    instagram: 100,
    linkedin: 200,
    dmPrivacy: 10,
    ringtone: 20,
    ringtoneCustomUrl: 500,
  };

  const update: Record<string, string> = {};
  for (const key of Object.keys(MAX_LEN)) {
    if (typeof body[key] === 'string') {
      update[key] = (body[key] as string).trim().slice(0, MAX_LEN[key]);
    }
  }

  if (update.website && !/^https?:\/\/.+/.test(update.website)) {
    return NextResponse.json(
      { success: false, error: 'website must be a valid URL.' },
      { status: 400 }
    );
  }
  if (update.ringtoneCustomUrl !== undefined && update.ringtoneCustomUrl !== '') {
    if (!/^https?:\/\/.+/.test(update.ringtoneCustomUrl)) {
      return NextResponse.json(
        { success: false, error: 'ringtoneCustomUrl must be a valid URL or empty.' },
        { status: 400 }
      );
    }
  }
  if (update.accentColor && !/^#[0-9a-fA-F]{6}$/.test(update.accentColor))
    delete update.accentColor;
  if (update.dmPrivacy && !['everyone', 'nobody'].includes(update.dmPrivacy))
    delete update.dmPrivacy;
  const VALID_RINGTONES = ['default', 'classic', 'digital', 'soft', 'pulse', 'custom'];
  if (update.ringtone && !VALID_RINGTONES.includes(update.ringtone)) delete update.ringtone;

  const profile = await upsertProfile(username, { ...update, ...sessionSnap });

  // Propagate display name and pfp changes to all conversations (fire-and-forget)
  const propagations: Promise<void>[] = [];
  if (update.displayName !== undefined)
    propagations.push(
      updateParticipantName(
        username,
        profile.displayName || `${profile.firstName} ${profile.lastName}`.trim() || username
      )
    );
  if (update.pfpUrl !== undefined) propagations.push(updateParticipantPfp(username, update.pfpUrl));
  await Promise.all(propagations);

  return NextResponse.json({ success: true, profile });
});
