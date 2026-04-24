import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { getConversationsForUser, findOrCreateDM } from "@/app/api/lib/messagingDb";
import { getProfile } from "@/app/api/lib/profileDb";
import { trackConversationCreated } from "@/app/api/lib/statsHelper";

// GET /api/conversations  – list all conversations for the current user
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const conversations = await getConversationsForUser(username);
  return NextResponse.json({ success: true, conversations });
}

// POST /api/conversations  – find or create a DM with another user
// Body: { targetUsername: string }
export async function POST(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { targetUsername?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const targetUsername = (body.targetUsername ?? "").trim();
  if (!targetUsername || targetUsername === username) {
    return NextResponse.json({ success: false, error: "Invalid target user." }, { status: 400 });
  }

  // Resolve display names from profiles
  const [myProfile, theirProfile] = await Promise.all([
    getProfile(username),
    getProfile(targetUsername),
  ]);

  const myDisplayName =
    myProfile?.displayName ||
    `${myProfile?.firstName ?? ""} ${myProfile?.lastName ?? ""}`.trim() ||
    username;

  const theirDisplayName =
    theirProfile?.displayName ||
    `${theirProfile?.firstName ?? ""} ${theirProfile?.lastName ?? ""}`.trim() ||
    targetUsername;

  if (!theirProfile) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }

  const { conversation, created } = await findOrCreateDM(
    username, myDisplayName,
    targetUsername, theirDisplayName
  );
  if (created) trackConversationCreated();
  return NextResponse.json({ success: true, conversation });
}
