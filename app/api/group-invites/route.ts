import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { getPendingInvitesForUser, sendGroupInvite, respondToGroupInvite } from "@/app/api/lib/groupInvitesDb";

// GET /api/group-invites — list pending group invites for the current user
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const invites = await getPendingInvitesForUser(username);
  return NextResponse.json({ success: true, invites });
}

// POST /api/group-invites — send an invite (admin only)
// Body: { conversationId: string, targetUsername: string }
export async function POST(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { conversationId?: string; targetUsername?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const { conversationId, targetUsername } = body;
  if (!conversationId || !targetUsername) {
    return NextResponse.json({ success: false, error: "Missing fields." }, { status: 400 });
  }

  const invite = await sendGroupInvite(conversationId, targetUsername.trim(), username);
  if (!invite) {
    return NextResponse.json({ success: false, error: "Could not send invite. Ensure you are the admin and the user is not already a member." }, { status: 400 });
  }
  return NextResponse.json({ success: true, invite });
}

// PATCH /api/group-invites — respond to an invite
// Body: { inviteId: string, accept: boolean }
export async function PATCH(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { inviteId?: string; accept?: boolean } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const { inviteId, accept } = body;
  if (!inviteId) return NextResponse.json({ success: false, error: "Missing inviteId." }, { status: 400 });

  try {
    const result = await respondToGroupInvite(inviteId, username, accept !== false);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
