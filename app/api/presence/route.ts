import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { updatePresence } from "@/app/api/lib/presenceDb";
import type { UserStatus } from "@/app/api/lib/presenceDb";

// PATCH /api/presence  — update my own presence
// Body: { status: "online" | "idle" | "offline" }
export async function PATCH(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { status?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const status = (["online", "idle", "offline"].includes(body.status ?? "")) ? body.status as UserStatus : "online";
  await updatePresence(username, status);
  return NextResponse.json({ success: true, status });
}
