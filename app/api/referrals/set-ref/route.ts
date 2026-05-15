import { NextRequest, NextResponse } from "next/server";
import { getUsernameByCode } from "@/app/api/lib/referralDb";

/**
 * POST /api/referrals/set-ref
 * Sets an httpOnly referral cookie so the login route can credit
 * the referrer when this visitor creates their first session.
 *
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid body." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.toUpperCase().trim() : "";
  if (!code || !/^[A-Z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ success: false, error: "Invalid code." }, { status: 400 });
  }

  // Verify the code actually exists before setting the cookie
  const owner = await getUsernameByCode(code);
  if (!owner) {
    return NextResponse.json({ success: false, error: "Code not found." }, { status: 404 });
  }

  const res = NextResponse.json({ success: true });
  // 30-day httpOnly cookie — cleared by the login route after use
  res.cookies.set("ssp_ref", code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
