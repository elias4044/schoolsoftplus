import { NextRequest, NextResponse } from "next/server";
import { createSchoolsoftClient, requireSession, getSessionCookies } from "@/app/api/lib/schoolsoft";
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
  const sess = await requireSession(req);
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
      name?: string;
      subject?: string;
      teacher?: string;
      room?: string;
      teachingGroup?: string;
      startDate?: string;
      endDate?: string;
      eventColor?: string;
      category?: string;
      status?: number;
    };

    // De-duplicate exact duplicate entries while preserving distinct simultaneous/overlapping lessons
    // (e.g. 4 different languages running concurrently at the same time slot)
    const uniqueLessons = new Map<string, Lesson>();
    const teachingGroupsSet = new Set<string>();

    (raw as Lesson[]).forEach((lesson) => {
      if (lesson?.startDate && lesson?.endDate) {
        if (lesson.teachingGroup) {
          teachingGroupsSet.add(lesson.teachingGroup);
        }

        // Composite key ensures distinct concurrent classes are NOT dropped
        const key = `${lesson.eventId ?? ""}|${lesson.startDate}|${lesson.endDate}|${lesson.name ?? lesson.subject ?? ""}|${lesson.room ?? ""}|${lesson.teacher ?? ""}|${lesson.teachingGroup ?? ""}`;
        if (!uniqueLessons.has(key)) {
          uniqueLessons.set(key, lesson);
        }
      }
    });

    let schedule = Array.from(uniqueLessons.values()).sort((a, b) => {
      return new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime();
    });

    // Optional filtering by class / teaching group
    const groupParam = req.nextUrl.searchParams.get("group") ?? req.nextUrl.searchParams.get("class");
    if (groupParam && groupParam !== "all") {
      schedule = schedule.filter((l) =>
        l.teachingGroup?.toLowerCase() === groupParam.toLowerCase() ||
        l.name?.toLowerCase().includes(groupParam.toLowerCase())
      );
    }

    const teachingGroups = Array.from(teachingGroupsSet).sort();

    trackScheduleView();
    return NextResponse.json({
      success: true,
      schedule,
      week,
      teachingGroups,
      totalLessons: schedule.length,
    });
  } catch (error) {
    return handleApiError(error, "schedule");
  }
}
