import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/app/api/lib/referralDb";
import { getProfile } from "@/app/api/lib/profileDb";

/**
 * GET /api/referrals/leaderboard
 * Public endpoint — returns the top referrers with display names.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  try {
    const entries = await getLeaderboard(limit);

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const profile = await getProfile(entry.username).catch(() => null);
        return {
          rank: entry.rank,
          username: entry.username,
          displayName: profile?.displayName || entry.username,
          pfpUrl: profile?.pfpUrl || "",
          schoolName: profile?.schoolName || "",
          totalReferrals: entry.totalReferrals,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error("[referrals/leaderboard] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load leaderboard." },
      { status: 500 }
    );
  }
}
