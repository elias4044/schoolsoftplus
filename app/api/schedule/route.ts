import { NextRequest, NextResponse } from "next/server";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";
import { trackScheduleView } from "@/app/api/lib/statsHelper";

export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school } = sess;
  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get("/rest-api/calendar/student/lessons", {
      headers: { Cookie: cookies, Accept: "application/json" },
      responseType: "json",
    });

    const uniqueLessons = new Map<string, unknown>();

    type Lesson = {
      eventId?: string;
      startDate?: string;
      endDate?: string;
    };

    (Object.values(response.data) as Lesson[]).forEach((lesson) => {
      if (lesson?.eventId && lesson?.startDate) {
        const key = `${lesson.startDate}-${lesson.endDate}`;
        if (!uniqueLessons.has(key)) uniqueLessons.set(key, lesson);
      }
    });

    const schedule = Array.from(uniqueLessons.values()).sort((a, b) => {
      const la = a as Lesson;
      const lb = b as Lesson;
      return new Date(la.startDate!).getTime() - new Date(lb.startDate!).getTime();
    });

    trackScheduleView();
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    return handleApiError(error, "schedule");
  }
}
