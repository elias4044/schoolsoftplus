import type {
  AssessedCriteriaTab,
  GradeInference,
  PartialMoment,
} from "./types";

export function inferGradeFromPoints(moments: PartialMoment[]): GradeInference | null {
  const totalMax = moments.reduce((s, m) => s + m.max, 0);
  if (totalMax === 0) return null;
  const totalPoints = moments.reduce((s, m) => s + m.points, 0);
  const pct = (totalPoints / totalMax) * 100;

  const grade =
    pct >= 95 ? "A" :
    pct >= 85 ? "B" :
    pct >= 70 ? "C" :
    pct >= 50 ? "D" :
    pct >= 40 ? "E" : "F";

  return { grade, confidence: "estimated", source: "points" };
}

export function inferGradeFromCriteria(tabs: AssessedCriteriaTab[]): GradeInference | null {
  const allCriteria = tabs.flatMap(t => t.assessedCriteria ?? []);
  if (!allCriteria.length) return null;
  const levels = allCriteria.map(c => c.level?.value ?? 0).filter(v => v >= 7);
  if (!levels.length) return null;
  const minLevel = Math.min(...levels);
  const avgLevel = levels.reduce((s, v) => s + v, 0) / levels.length;
  const effective = minLevel * 0.65 + avgLevel * 0.35;
  const grade =
    effective >= 10.5 ? "A" :
    effective >= 9.5 ? "B" :
    effective >= 8.5 ? "C" :
    effective >= 7.5 ? "D" :
    effective >= 7 ? "E" : "F";
  return { grade, confidence: "estimated", source: "criteria" };
}

export function inferGrade(
  moments: PartialMoment[],
  tabs: AssessedCriteriaTab[]
): GradeInference | null {
  if (tabs.length > 0) return inferGradeFromCriteria(tabs);
  if (moments.length > 0) return inferGradeFromPoints(moments);
  return null;
}

/** Normalize raw SchoolSoft assessment payload */
export function normalizeAssessmentRaw(raw: unknown): {
  review: string;
  partialMoments: PartialMoment[];
  assessedCriteriaTabs: AssessedCriteriaTab[];
} {
  if (!raw || typeof raw !== "object") {
    return { review: "", partialMoments: [], assessedCriteriaTabs: [] };
  }
  const r = raw as Record<string, unknown>;
  const moments: PartialMoment[] = [];
  const rawMoments = Array.isArray(r.assessmentPartialMoments)
    ? r.assessmentPartialMoments
    : [];
  for (const m of rawMoments as Record<string, unknown>[]) {
    if (typeof m.points === "number" && typeof m.max === "number") {
      moments.push({
        id: typeof m.id === "number" ? m.id : undefined,
        name: String(m.name ?? ""),
        points: m.points,
        max: m.max,
      });
    }
  }
  const tabs = Array.isArray(r.assessedCriteriaTabs)
    ? (r.assessedCriteriaTabs as AssessedCriteriaTab[])
    : [];
  return {
    review: (r.review as string) ?? "",
    partialMoments: moments,
    assessedCriteriaTabs: tabs,
  };
}
