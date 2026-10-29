import { NextRequest, NextResponse } from 'next/server';

import { getProfile } from '@/app/api/lib/profileDb';
import { getOrCreateReferralCode } from '@/app/api/lib/referralDb';
import { withValidation } from '@/app/api/lib/routeValidation';
import { applySessionCookieUpdates, requireSession } from '@/app/api/lib/schoolsoft';

/**
 * GET /api/referrals
 * Returns the authenticated user's referral code and stats.
 * Creates a code automatically if one doesn't exist yet.
 */
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const data = await getOrCreateReferralCode(sess.userId);

    // Enrich referred users with their display names
    const enriched = await Promise.all(
      data.referredUsers.map(async (entry) => {
        const profile = await getProfile(entry.userId).catch(() => null);
        return {
          username: entry.userId,
          userId: entry.userId,
          displayName: profile?.displayName || entry.userId,
          pfpUrl: profile?.pfpUrl || '',
          joinedAt: entry.joinedAt,
        };
      })
    );

    const res = NextResponse.json({
      success: true,
      data: {
        ...data,
        referredUsers: enriched,
      },
    });
    applySessionCookieUpdates(res, sess.cookieUpdates);
    return res;
  } catch (err) {
    console.error('[referrals] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load referral data.' },
      { status: 500 }
    );
  }
});
