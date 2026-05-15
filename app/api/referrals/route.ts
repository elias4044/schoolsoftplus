import { NextRequest, NextResponse } from "next/server";
import { requireSession, applySessionCookieUpdates } from "@/app/api/lib/schoolsoft";
import { authUser } from "@/app/api/lib/auth";
import { getOrCreateReferralCode } from "@/app/api/lib/referralDb";
import { getProfile } from "@/app/api/lib/profileDb";

/**
 * GET /api/referrals
 * Returns the authenticated user's referral code and stats.
 * Creates a code automatically if one doesn't exist yet.
 */
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }
  if (!(await authUser(sess.cookieString, sess.school))) {
    return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
  }

  try {
    const data = await getOrCreateReferralCode(sess.username);

    // Enrich referred users with their display names
    const enriched = await Promise.all(
      data.referredUsers.map(async (entry) => {
        const profile = await getProfile(entry.username).catch(() => null);
        return {
          username: entry.username,
          displayName: profile?.displayName || entry.username,
          pfpUrl: profile?.pfpUrl || "",
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
    console.error("[referrals] GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load referral data." },
      { status: 500 }
    );
  }
}
