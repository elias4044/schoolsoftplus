import { NextRequest, NextResponse } from 'next/server';

import { getProfile } from '@/app/api/lib/profileDb';
import { getLeaderboard } from '@/app/api/lib/referralDb';
import { withValidation } from '@/app/api/lib/routeValidation';

/**
 * GET /api/referrals/leaderboard
 * Public endpoint — returns the top referrers with display names.
 */
export const GET = withValidation(async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? '20');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    return NextResponse.json({ error: 'limit must be between 1 and 50.' }, { status: 400 });

  try {
    const entries = await getLeaderboard(limit);

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const profile = await getProfile(entry.userId).catch(() => null);
        return {
          rank: entry.rank,
          username: entry.userId,
          userId: entry.userId,
          displayName: profile?.displayName || entry.userId,
          pfpUrl: profile?.pfpUrl || '',
          schoolName: profile?.schoolName || '',
          totalReferrals: entry.totalReferrals,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[referrals/leaderboard] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load leaderboard.' },
      { status: 500 }
    );
  }
});
