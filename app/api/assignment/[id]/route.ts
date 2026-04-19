import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

// ---------------------------------------------------------------------------
// GET /api/assignment/[id]?type=assignment|planning
//
// Aggregates all data for a single assignment or planning into one response:
//   { assignment, sections, connectedPlannings, assessment, grading }
//
// Dependent fetches are only made when the base view indicates they exist,
// and every sub-request is treated as optional (404 → null, no hard fail).
// ---------------------------------------------------------------------------

const BASE = "/rest-api/student/ps";

/** Safely fetch a URL — returns null on 404 or any non-critical error. */
async function safeFetch(
    api: ReturnType<typeof createSchoolsoftClient>,
    url: string,
    cookies: string
): Promise<unknown> {
    try {
        const res = await api.get(url, {
            headers: { Cookie: cookies },
            responseType: "json",
        });
        return res.data ?? null;
    } catch (err) {
        const status = (err as { response?: { status: number } }).response?.status;
        if (status === 404 || status === 403) return null;
        throw err; // re-throw unexpected errors
    }
}

/** Normalise the raw assessment object into a predictable shape. */
function normalizeAssessment(raw: unknown): {
    review: string;
    teacherComment: string;
    studentComment: string;
    partialMoments: unknown[];
    assessedCriteriaTabs: unknown[];
} {
    if (!raw || typeof raw !== "object") {
        return { review: "", teacherComment: "", studentComment: "", partialMoments: [], assessedCriteriaTabs: [] };
    }
    const r = raw as Record<string, unknown>;
    return {
        review: (r.review as string) ?? "",
        teacherComment: (r.teacherComment as string) ?? "",
        studentComment: (r.studentComment as string) ?? "",
        assessedCriteriaTabs: Array.isArray(r.assessedCriteriaTabs) ? r.assessedCriteriaTabs : [],
        partialMoments: Array.isArray(r.assessmentPartialMoments) ? r.assessmentPartialMoments : [],
    };
}

/** Pull the top-level fields we always want from the view payload. */
function normalizeAssignmentView(raw: Record<string, unknown>, id: string) {
    return {
        id: Number(id),
        title: (raw.title as string) ?? "",
        subTitle: (raw.subTitle as string) ?? null,
        description: (raw.description as string) ?? null,
        status: (raw.status as string) ?? "",
        endDate: (raw.endDate as string) ?? null,
        endTime: (raw.endTime as string) ?? null,
        publishDate: (raw.publishDate as string) ?? null,
        subjectNames: (raw.subjectNames as string) ?? "",
        subjectRoomId: (raw.subjectRoomId as number) ?? null,
        submissionStatus: (raw.submissionStatus as string) ?? "NO_STATUS",
        resultReportStatus: (raw.resultReportStatus as string) ?? "NO_STATUS",
        // keep the full raw payload available for forward compatibility
        _raw: raw,
    };
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "assignment"; // default to assignment

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
        // -------------------------------------------------------------------------
        // PLANNING
        // -------------------------------------------------------------------------
        if (type === "planning") {
            const tabs = await safeFetch(api, `${BASE}/plannings/${id}/planning_parts/tabs`, cookies) as { id: string }[] | null;
            if (!tabs?.length) {
                return NextResponse.json({ success: false, error: "Planning not found." }, { status: 404 });
            }

            const partId = tabs[0].id;
            const view = await safeFetch(api, `${BASE}/planning_parts/${partId}/view`, cookies);
            if (!view) {
                return NextResponse.json({ success: false, error: "Planning view not found." }, { status: 404 });
            }

            const sections = await safeFetch(api, `${BASE}/planning_parts/${partId}/sections`, cookies);

            return NextResponse.json({
                success: true,
                type: "planning",
                assignment: view,
                sections: Array.isArray(sections) ? sections : [],
                connectedPlannings: [],
                assessment: normalizeAssessment(null),
                grading: { availableColumns: [], selectedCriteria: [] },
            });
        }

        // -------------------------------------------------------------------------
        // ASSIGNMENT
        // -------------------------------------------------------------------------
        const viewRaw = await safeFetch(api, `${BASE}/assignments/${id}/view`, cookies) as Record<string, unknown> | null;
        if (!viewRaw) {
            return NextResponse.json({ success: false, error: "Assignment not found." }, { status: 404 });
        }

        const assignment = normalizeAssignmentView(viewRaw, id);

        // Fetch everything that can be fetched in parallel
        const [sectionsRaw, connectedPlanningsRaw, assessmentRaw, availableColumnsRaw] =
            await Promise.all([
                safeFetch(api, `${BASE}/assignments/${id}/sections`, cookies),
                safeFetch(api, `${BASE}/assignments/${id}/connected_plannings`, cookies),
                safeFetch(api, `${BASE}/assignment/${id}/assessment`, cookies),
                safeFetch(api, `${BASE}/assignment/${id}/assessment/grid/available-columns`, cookies),
            ]);

        const sections: unknown[] = Array.isArray(sectionsRaw) ? sectionsRaw : [];
        const connectedPlannings: unknown[] = Array.isArray(connectedPlanningsRaw) ? connectedPlanningsRaw : [];
        const availableColumns: unknown[] = Array.isArray(availableColumnsRaw) ? availableColumnsRaw : [];

        // Conditionally fetch selected criteria for each GRADECRITERIA section
        const selectedCriteria: unknown[] = [];
        const gradeCriteriaSections = sections.filter(
            (s) => (s as Record<string, unknown>).type === "GRADECRITERIA"
        ) as { id: string; typeId?: string }[];

        if (gradeCriteriaSections.length > 0) {
            const criteriaResults = await Promise.all(
                gradeCriteriaSections.map((s) =>
                    safeFetch(
                        api,
                        `${BASE}/grade_subject/${s.typeId ?? s.id}/grade_criteria/${s.id}/selected`,
                        cookies
                    )
                )
            );
            criteriaResults.forEach((r) => {
                if (r) selectedCriteria.push(r);
            });
        }

        return NextResponse.json({
            success: true,
            type: "assignment",
            assignment,
            sections,
            connectedPlannings,
            assessment: normalizeAssessment(assessmentRaw),
            grading: {
                availableColumns,
                selectedCriteria,
            },
        });
    } catch (error) {
        return handleApiError(error, `assignment/${id}`);
    }
}
