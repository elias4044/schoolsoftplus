import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { requireSession, getSessionCookies } from "@/app/api/lib/schoolsoft";
import {
  getFriends, getPendingRequestsReceived, getPendingRequestsSent,
  sendFriendRequest, getFriendship,
} from "@/app/api/lib/friendsDb";
import { getProfile } from "@/app/api/lib/profileDb";

// GET /api/friends  — friends list + pending requests
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const [friends, received, sent] = await Promise.all([
    getFriends(username),
    getPendingRequestsReceived(username),
    getPendingRequestsSent(username),
  ]);

  // Enrich with display names from profiles
  const allUsernames = new Set<string>();
  for (const f of friends) {
    allUsernames.add(f.userA === username ? f.userB : f.userA);
  }
  for (const f of received) {
    allUsernames.add(f.requestedBy);
  }
  for (const f of sent) {
    const other = f.userA === username ? f.userB : f.userA;
    allUsernames.add(other);
  }

  const profileMap: Record<string, { displayName: string; pfpUrl: string; schoolName: string }> = {};
  await Promise.all([...allUsernames].map(async u => {
    const p = await getProfile(u);
    if (p) {
      profileMap[u] = {
        displayName: p.displayName || `${p.firstName} ${p.lastName}`.trim() || u,
        pfpUrl:      p.pfpUrl ?? "",
        schoolName:  p.schoolName ?? "",
      };
    }
  }));

  return NextResponse.json({ success: true, friends, received, sent, profileMap });
}

// POST /api/friends  — send a friend request
// Body: { targetUsername: string }
export async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { targetUsername?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const target = (body.targetUsername ?? "").trim();
  if (!target || target === username) {
    return NextResponse.json({ success: false, error: "Invalid target user." }, { status: 400 });
  }

  // Make sure the target profile exists
  const targetProfile = await getProfile(target);
  if (!targetProfile) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }

  try {
    const friendship = await sendFriendRequest(username, target);
    return NextResponse.json({ success: true, friendship });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// DELETE /api/friends  — unfriend (body: { targetUsername })
export async function DELETE(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { targetUsername?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const target = (body.targetUsername ?? "").trim();
  if (!target) return NextResponse.json({ success: false, error: "Invalid target." }, { status: 400 });

  const { removeFriend } = await import("@/app/api/lib/friendsDb");
  await removeFriend(username, target);
  return NextResponse.json({ success: true });
}

// PATCH /api/friends — respond to a friend request
// Body: { fromUsername: string, accept: boolean }
export async function PATCH(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { fromUsername?: string; accept?: boolean } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const from = (body.fromUsername ?? "").trim();
  if (!from) return NextResponse.json({ success: false, error: "Missing fromUsername." }, { status: 400 });

  const { respondToFriendRequest } = await import("@/app/api/lib/friendsDb");
  const friendship = await respondToFriendRequest(username, from, body.accept !== false);
  if (!friendship) return NextResponse.json({ success: false, error: "Request not found." }, { status: 404 });

  // If checking status only
  const existing = await getFriendship(username, from);
  return NextResponse.json({ success: true, friendship: friendship ?? existing });
}
