import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSchool, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

// -- GET /api/subjects/[id]  ---------------------------------------------------
// Returns detailed data for a single subject room.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const api = createSchoolsoftClient(school);  try {
    const [subjectRes, examinationsRes, submissionsRes, assignmentsRes] =
      await Promise.all([
        api.get(`/rest-api/student/ps/subjectroom/${id}`, {
          headers: { Cookie: cookies },
          responseType: "json",
        }),
        api.get(
          `/rest-api/student/ps/assignments/examinations?activityId=${id}`,
          { headers: { Cookie: cookies }, responseType: "json" }
        ),
        api.get(
          `/rest-api/student/ps/assignments/submissions?activityId=${id}`,
          { headers: { Cookie: cookies }, responseType: "json" }
        ),
        api.get(
          `/rest-api/student/ps/subjectroom/${id}/table/rows`,
          { headers: { Cookie: cookies }, responseType: "json" }
        ),
      ]);

    return NextResponse.json({
      success: true,
      subject: subjectRes.data,
      overview: {
        examinations: examinationsRes.data,
        submissions: submissionsRes.data,
      },
      assignments: assignmentsRes.data,
    });
  } catch (error) {
    return handleApiError(error, "subjectData");
  }
}
