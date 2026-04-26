import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { getProfile } from "@/app/api/lib/profileDb";

/**
 * GET /api/profile/[username]
 * Public-ish: any authenticated user can view another user's profile.
 * Email is omitted from the response.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  if (!(await authUser(sess.cookieString, sess.school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { username } = await params;
  const profile = await getProfile(username.toLowerCase().trim());
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });

  // Strip private fields before returning to other users
  const { email: _email, ...publicProfile } = profile;
  void _email;
  return NextResponse.json({ success: true, profile: publicProfile });
}
