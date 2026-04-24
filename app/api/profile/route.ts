import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { getProfile, upsertProfile } from "@/app/api/lib/profileDb";

// -- GET /api/profile  -------------------------------------------------------
// Returns the current user's profile (merged with session snapshot).
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const profile = await getProfile(username);
  return NextResponse.json({ success: true, profile });
}

// -- PUT /api/profile  -------------------------------------------------------
// Updates mutable profile fields for the authenticated user.
// Also re-snapshots session fields (name, email, school, userType).
export async function PUT(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  // Fetch live session snapshot
  const api = createSchoolsoftClient(school);
  let sessionSnap: {
    firstName: string;
    lastName: string;
    email: string;
    schoolName: string;
    userType: string;
  } = { firstName: "", lastName: "", email: "", schoolName: "", userType: "" };

  try {
    const { data, status } = await api.get("/rest-api/session", {
      headers: { Cookie: cookieString },
      responseType: "json",
    });
    if (status === 200) {
      sessionSnap = {
        firstName:  data.user?.firstName ?? "",
        lastName:   data.user?.lastName  ?? "",
        email:      data.user?.email     ?? "",
        schoolName: data.organization?.name ?? "",
        userType:   data.userType?.name  ?? "",
      };
    }
  } catch {
    // Non-fatal – proceed without snapshot refresh
  }

  // Parse body — only accept allowed mutable fields
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const ALLOWED = ["displayName", "bio", "location", "website", "pfpUrl"] as const;
  const update: Record<string, string> = {};
  for (const key of ALLOWED) {
    if (typeof body[key] === "string") {
      // Basic length guard
      const maxLen: Record<string, number> = {
        displayName: 80,
        bio: 300,
        location: 80,
        website: 200,
        pfpUrl: 500,
      };
      const val = (body[key] as string).trim().slice(0, maxLen[key]);
      update[key] = val;
    }
  }

  // website must be empty or a valid http/https URL
  if (update.website && !/^https?:\/\/.+/.test(update.website)) {
    return NextResponse.json({ success: false, error: "website must be a valid URL." }, { status: 400 });
  }

  const profile = await upsertProfile(username, { ...update, ...sessionSnap });
  return NextResponse.json({ success: true, profile });
}
