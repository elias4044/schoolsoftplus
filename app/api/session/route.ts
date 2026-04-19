import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";

// -- GET /api/session  --------------------------------------------------------
// Returns the current session information.
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school, username } = sess;

  if (!(await authUser(cookies, school))) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const api = createSchoolsoftClient(school);

  try {
    const { data, status } = await api.get(
      "/rest-api/session",
      { headers: { Cookie: cookies }, responseType: "json" }
    );

    if (status !== 200) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, session: { ...data, school, username } });
  } catch (error) {
    console.error("[session] Error:", (error as Error).message);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session info." },
      { status: 500 }
    );
  }
}