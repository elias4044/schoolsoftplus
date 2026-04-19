import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

type SubjectEntity = {
  planningId?: string;
  [key: string]: unknown;
};

// -- GET /api/subjects  --------------------------------------------------------
// Returns all subjects, each enriched with entities, unread counts, and teachers.
export async function GET(req: NextRequest) {
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
    const { data: subjects } = await api.get(
      "/rest-api/student/ps/subjectroom/all",
      { headers: { Cookie: cookies }, responseType: "json" }
    );

    const enriched = await Promise.all(
      (subjects as { activityId: string }[]).map(async (subject) => {
        const id = subject.activityId;
        try {
          const [entitiesRes, unreadRes, teachersRes] = await Promise.all([
            api.get(`/rest-api/student/ps/subjectroom/${id}/entities`, {
              headers: { Cookie: cookies },
              responseType: "json",
            }),
            api.get(`/rest-api/student/ps/subjectroom/${id}/unread_entities`, {
              headers: { Cookie: cookies },
              responseType: "json",
            }),
            api.get(`/rest-api/student/ps/subjectroom/${id}/teachers`, {
              headers: { Cookie: cookies },
              responseType: "json",
            }),
          ]);

          const entities = (entitiesRes.data as SubjectEntity[]).map((e) => ({
            ...e,
            entityType: e.planningId ? "PLANNING" : "ASSIGNMENT",
          }));

          return {
            ...subject,
            id,
            entities,
            unreadEntities: parseInt(String(unreadRes.data), 10),
            teachers: teachersRes.data,
          };
        } catch (err) {
          console.error(
            `[subjects] Failed to fetch details for subject ${id}:`,
            (err as Error).message
          );
          return { ...subject, id, entities: [], unreadEntities: 0, teachers: [] };
        }
      })
    );

    return NextResponse.json({ success: true, subjects: enriched });
  } catch (error) {
    return handleApiError(error, "subjects");
  }
}
