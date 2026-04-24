import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { searchUsers } from "@/app/api/lib/messagingDb";

// GET /api/users/search?q=query
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ success: true, users: [] });

  const users = await searchUsers(q, username);
  return NextResponse.json({ success: true, users });
}
