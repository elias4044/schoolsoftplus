import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, requireSession } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";
import {
  inferGrade,
  normalizeAssessmentRaw,
} from "@/lib/grades/inferGrade";
import { parseGradeFromReview } from "@/lib/grades/constants";
import type { ScannedGradeResult } from "@/lib/grades/types";

const BASE = "/rest-api/student/ps";

/** Optional SchoolSoft sub-requests — never fail the whole scan */
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
    if (status === 404 || status === 403 || status === 400 || (status != null && status >= 500)) {
      return null;
    }
    throw err;
  }
}

interface TableRow {
  id: number;
  entityType: string;
  title: string;
  type: string;
  endDate: string;
  resultReportStatus: string;
  status: string;
}

async function scanAssignment(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  row: TableRow
): Promise<ScannedGradeResult | null> {
  try {
    const rowReported = row.resultReportStatus === "REPORTED";

    // Reported rows already have enough list metadata — skip /view (often 500s on old items)
    let viewRaw: Record<string, unknown> | null = null;
    if (!rowReported) {
      if (row.status !== "EXPIRED") return null;
      viewRaw = (await safeFetch(
        api,
        `${BASE}/assignments/${row.id}/view`,
        cookies
      )) as Record<string, unknown> | null;
      if (!viewRaw) return null;
      if ((viewRaw.resultReportStatus as string) !== "REPORTED") return null;
    }

    const assessmentRaw = await safeFetch(
      api,
      `${BASE}/assignment/${row.id}/assessment`,
      cookies
    );
    if (!assessmentRaw) return null;

    const assessment = normalizeAssessmentRaw(assessmentRaw);
    const inference = inferGrade(assessment.partialMoments, assessment.assessedCriteriaTabs);

    const reviewGrade = assessment.review ? parseGradeFromReview(assessment.review) : null;
    const totalMax = assessment.partialMoments.reduce((s, m) => s + m.max, 0);
    const totalPoints = assessment.partialMoments.reduce((s, m) => s + m.points, 0);
    const pointsPct = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : undefined;
    const totalPointsStr = totalMax > 0 ? `${totalPoints} / ${totalMax}` : undefined;

    let grade = "—";
    let gradeSource: ScannedGradeResult["gradeSource"];
    let confidence = inference?.confidence;

    if (reviewGrade) {
      grade = reviewGrade;
      gradeSource = "review";
      confidence = "confirmed";
    } else if (inference) {
      grade = inference.grade;
      gradeSource = inference.source;
    } else if (!assessment.review) {
      return null;
    }

    if (grade === "—") return null;

    const reported = rowReported || (viewRaw?.resultReportStatus as string) === "REPORTED";

    return {
      assignmentId: row.id,
      title: String(viewRaw?.title ?? row.title ?? "Assignment"),
      type: String(viewRaw?.type ?? row.type ?? "Assignment"),
      endDate: String(viewRaw?.endDate ?? row.endDate ?? ""),
      reported,
      review: assessment.review,
      estimatedGrade: inference?.grade,
      confidence,
      gradeSource,
      grade,
      totalPoints: totalPointsStr,
      pointsPct,
    };
  } catch {
    return null;
  }
}

async function fetchTableRows(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  subjectId: string
): Promise<TableRow[]> {
  try {
    const res = await api.get(
      `/rest-api/student/ps/subjectroom/${subjectId}/table/rows`,
      { headers: { Cookie: cookies }, responseType: "json" }
    );
    return (Array.isArray(res.data) ? res.data : []) as TableRow[];
  } catch (err) {
    const status = (err as { response?: { status: number } }).response?.status;
    if (status === 404 || status === 403) return [];
    throw err;
  }
}

/** POST /api/subjects/[id]/grades — scan reported assignments for grades */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;
  if (!(await authUser(cookies, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const api = createSchoolsoftClient(school);

  try {
    const rows = await fetchTableRows(api, cookies, id);

    const reported = rows.filter(
      r => r.entityType === "ASSIGNMENT" && r.resultReportStatus === "REPORTED"
    );
    // Expired without reported flag: try view+assessment (failures are skipped per-item)
    const expiredMaybe = rows.filter(
      r =>
        r.entityType === "ASSIGNMENT" &&
        r.status === "EXPIRED" &&
        r.resultReportStatus !== "REPORTED"
    );
    const toScan = [...reported, ...expiredMaybe];

    const batchSize = 4;
    const results: ScannedGradeResult[] = [];
    let skipped = 0;

    for (let i = 0; i < toScan.length; i += batchSize) {
      const batch = toScan.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map(row => scanAssignment(api, cookies, row))
      );
      for (const outcome of settled) {
        if (outcome.status === "fulfilled" && outcome.value) {
          results.push(outcome.value);
        } else {
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      scanned: results.length,
      total: toScan.length,
      skipped,
      grades: results,
    });
  } catch (error) {
    return handleApiError(error, `subjects/${id}/grades`);
  }
}
