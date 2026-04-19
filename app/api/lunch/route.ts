import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";
import { trackLunchFetch } from "@/app/api/lib/statsHelper";

// -- GET /api/lunch?week=xx  ---------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");

  if (!week) {
    return NextResponse.json(
      { success: false, error: "week query parameter is required." },
      { status: 400 }
    );
  }

  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school } = sess;

  if (!(await authUser(cookies, school))) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get(`/rest-api/lunchmenu/week/${week}`, {
      headers: { Cookie: cookies },
      responseType: "json",
    });
    trackLunchFetch();
    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    return handleApiError(error, "lunch");
  }
}
