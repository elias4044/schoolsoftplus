import { NextRequest, NextResponse } from "next/server";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";
import { trackScheduleView } from "@/app/api/lib/statsHelper";

/** ISO week number for a given date */
function isoWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86_400_000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

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

  // Accept an explicit ?week=N, fall back to the current ISO week
  const weekParam = req.nextUrl.searchParams.get("week");
  const week = weekParam ? parseInt(weekParam, 10) : isoWeek(new Date());

  if (Number.isNaN(week) || week < 1 || week > 53) {
    return NextResponse.json(
      { success: false, error: "Invalid week number." },
      { status: 400 }
    );
  }

  try {
    const response = await api.get(
      `/rest-api/student/calendar/lessons/week/${week}`,
      {
        headers: { Cookie: cookies, Accept: "application/json" },
        responseType: "json",
      }
    );

    // The endpoint returns an array directly
    const raw: unknown[] = Array.isArray(response.data) ? response.data : Object.values(response.data as object);

    type Lesson = {
      eventId?: number | string;
      startDate?: string;
      endDate?: string;
    };

    // De-duplicate by startDate+endDate (same as before)
    const uniqueLessons = new Map<string, unknown>();
    (raw as Lesson[]).forEach((lesson) => {
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
    return NextResponse.json({ success: true, schedule, week });
  } catch (error) {
    return handleApiError(error, "schedule");
  }
}
