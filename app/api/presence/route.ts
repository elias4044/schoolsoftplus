import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { computeStatus, getPresenceForUsers, updatePresence } from "@/app/api/lib/presenceDb";
import type { UserStatus } from "@/app/api/lib/presenceDb";

const MAX_USERS_PER_REQUEST = 100;

export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const rawUsers = req.nextUrl.searchParams.get("users") ?? "";
  const usernames = [...new Set(
    rawUsers
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  )].slice(0, MAX_USERS_PER_REQUEST);

  if (usernames.length === 0) {
    return NextResponse.json({ success: true, presences: {} });
  }

  const records = await getPresenceForUsers(usernames);
  const presences = Object.fromEntries(
    usernames.map((username) => {
      const record = records[username] ?? null;
      return [username, computeStatus(record)];
    })
  );

  return NextResponse.json({ success: true, presences });
}

// PATCH /api/presence  — update my own presence
// Body: { status: "online" | "idle" | "offline" }
export async function PATCH(req: NextRequest) {
  const sess = await requireSession(req);
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
