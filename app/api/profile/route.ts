import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { getProfile, upsertProfile } from "@/app/api/lib/profileDb";
import { updateParticipantName, updateParticipantPfp } from "@/app/api/lib/messagingDb";

// -- GET /api/profile  -------------------------------------------------------
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }
  const profile = await getProfile(username);
  return NextResponse.json({ success: true, profile });
}

// -- PUT /api/profile  -------------------------------------------------------
export async function PUT(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const api = createSchoolsoftClient(school);
  let sessionSnap = { firstName: "", lastName: "", email: "", schoolName: "", userType: "" };
  try {
    const { data, status } = await api.get("/rest-api/session", {
      headers: { Cookie: cookieString },
      responseType: "json",
    });
    if (status === 200) {
      sessionSnap = {
        firstName:  data.user?.firstName    ?? "",
        lastName:   data.user?.lastName     ?? "",
        email:      data.user?.email        ?? "",
        schoolName: data.organization?.name ?? "",
        userType:   data.userType?.name     ?? "",
      };
    }
  } catch { /* non-fatal */ }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 }); }

  const MAX_LEN: Record<string, number> = {
    displayName: 80, bio: 500, pronouns: 40, location: 80,
    website: 200, pfpUrl: 500, coverUrl: 500, accentColor: 30,
    github: 100, twitter: 100, instagram: 100, linkedin: 200, dmPrivacy: 10,
  };

  const update: Record<string, string> = {};
  for (const key of Object.keys(MAX_LEN)) {
    if (typeof body[key] === "string") {
      update[key] = (body[key] as string).trim().slice(0, MAX_LEN[key]);
    }
  }

  if (update.website && !/^https?:\/\/.+/.test(update.website)) {
    return NextResponse.json({ success: false, error: "website must be a valid URL." }, { status: 400 });
  }
  if (update.accentColor && !/^#[0-9a-fA-F]{6}$/.test(update.accentColor)) delete update.accentColor;
  if (update.dmPrivacy && !["everyone", "nobody"].includes(update.dmPrivacy)) delete update.dmPrivacy;

  const profile = await upsertProfile(username, { ...update, ...sessionSnap });

  // Propagate display name and pfp changes to all conversations (fire-and-forget)
  const propagations: Promise<void>[] = [];
  if (update.displayName) propagations.push(updateParticipantName(username, update.displayName));
  if (update.pfpUrl !== undefined) propagations.push(updateParticipantPfp(username, update.pfpUrl));
  await Promise.all(propagations);

  return NextResponse.json({ success: true, profile });
}
