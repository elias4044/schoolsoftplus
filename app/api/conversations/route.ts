import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { getConversationsForUser, findOrCreateDM, createGroupChat } from "@/app/api/lib/messagingDb";
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

// POST /api/conversations
//   DM:    { type?: "dm", targetUsername: string }
//   Group: { type: "group", groupName: string, groupDescription?: string, members: string[] }
export async function POST(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: {
    type?: string;
    targetUsername?: string;
    groupName?: string;
    groupDescription?: string;
    members?: string[];
  } = {};
  try { body = await req.json(); } catch { /* empty */ }

  /* ── Group chat ───────────────────────────────────────── */
  if (body.type === "group") {
    const groupName = (body.groupName ?? "").trim();
    if (!groupName) return NextResponse.json({ success: false, error: "Group name is required." }, { status: 400 });

    const memberUsernames: string[] = (body.members ?? [])
      .map((u: string) => u.trim())
      .filter((u: string) => u && u !== username)
      .slice(0, 49); // max 50 participants incl. creator

    if (memberUsernames.length < 1) {
      return NextResponse.json({ success: false, error: "Add at least one other member." }, { status: 400 });
    }

    // Fetch all display names in parallel
    const [myProfile, ...memberProfiles] = await Promise.all([
      getProfile(username),
      ...memberUsernames.map(u => getProfile(u)),
    ]);

    const myDisplayName =
      myProfile?.displayName ||
      `${myProfile?.firstName ?? ""} ${myProfile?.lastName ?? ""}`.trim() ||
      username;

    const members = memberUsernames.map((u, i) => {
      const p = memberProfiles[i];
      return {
        username: u,
        displayName: p?.displayName || `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim() || u,
        pfpUrl: p?.pfpUrl ?? "",
      };
    });

    const conversation = await createGroupChat({
      creatorUsername: username,
      creatorDisplayName: myDisplayName,
      creatorPfpUrl: myProfile?.pfpUrl ?? "",
      groupName,
      groupDescription: body.groupDescription,
      members,
    });

    trackConversationCreated();
    return NextResponse.json({ success: true, conversation });
  }

  /* ── DM ───────────────────────────────────────────────── */
  const targetUsername = (body.targetUsername ?? "").trim();
  if (!targetUsername || targetUsername === username) {
    return NextResponse.json({ success: false, error: "Invalid target user." }, { status: 400 });
  }

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
    targetUsername, theirDisplayName,
    myProfile?.pfpUrl ?? "",
    theirProfile?.pfpUrl ?? ""
  );
  if (created) trackConversationCreated();
  return NextResponse.json({ success: true, conversation });
}
