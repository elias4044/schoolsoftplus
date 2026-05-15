import { NextRequest, NextResponse } from "next/server";
import { getUsernameByCode } from "@/app/api/lib/referralDb";
import { getProfile } from "@/app/api/lib/profileDb";

/**
 * GET /api/referrals/validate/[code]
 * Public endpoint — validates a referral code and returns minimal referrer info
 * (display name, school, pfp) for the join page. Does not expose private data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ success: false, error: "Missing code." }, { status: 400 });
  }

  // Validate code format before any DB lookup
  const clean = code.toUpperCase().trim();
  if (!/^[A-Z0-9]{6,12}$/.test(clean)) {
    return NextResponse.json({ success: false, error: "Invalid code." }, { status: 400 });
  }

  try {
    const username = await getUsernameByCode(clean);
    if (!username) {
      return NextResponse.json({ success: false, error: "Invalid or expired code." }, { status: 404 });
    }

    const profile = await getProfile(username).catch(() => null);

    return NextResponse.json({
      success: true,
      referrer: {
        username,
        displayName: profile?.displayName || username,
        pfpUrl: profile?.pfpUrl || "",
        schoolName: profile?.schoolName || "",
      },
    });
  } catch (err) {
    console.error("[referrals/validate] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to validate code." },
      { status: 500 }
    );
  }
}
