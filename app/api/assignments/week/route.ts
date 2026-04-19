import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";
import { trackAssignmentsFetch } from "@/app/api/lib/statsHelper";

// -- GET /api/assignments/week?week=xx&year=xxxx  ------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");
  const year = searchParams.get("year");

  if (!week || !year) {
    return NextResponse.json(
      { success: false, error: "week and year query parameters are required." },
      { status: 400 }
    );
  }

  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }
  const { cookieString: cookies, school } = sess;

  if (!(await authUser(cookies, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get(
      `/rest-api/student/ps/assignments/start-page?week=${week}&year=${year}`,
      { headers: { Cookie: cookies }, responseType: "json" }
    );
    trackAssignmentsFetch();
    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    return handleApiError(error, "weekAssignments");
  }
}
