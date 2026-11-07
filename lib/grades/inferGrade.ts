import type { AssessedCriteriaTab, CriteriaLevel, GradeInference, PartialMoment } from './types';

export function isFailedCriterion(level?: CriteriaLevel): boolean {
  return level?.levelEnum === 'FAIL_TO_MEET_CRITERIA' || level?.levelEnum === 'MEET_F_LEVEL';
}

export function inferGradeFromPoints(moments: PartialMoment[]): GradeInference | null {
  const scored = moments.filter(
    (moment) =>
      Number.isFinite(moment.points) &&
      Number.isFinite(moment.max) &&
      moment.points >= 0 &&
      moment.max > 0
  );
  const totalMax = scored.reduce((s, m) => s + m.max, 0);
  if (totalMax === 0) return null;
  const totalPoints = scored.reduce((s, m) => s + m.points, 0);
  const pct = (totalPoints / totalMax) * 100;

  const grade =
    pct >= 95 ? 'A' : pct >= 85 ? 'B' : pct >= 70 ? 'C' : pct >= 50 ? 'D' : pct >= 40 ? 'E' : 'F';

  return { grade, confidence: 'estimated', source: 'points' };
}

export function inferGradeFromCriteria(tabs: AssessedCriteriaTab[]): GradeInference | null {
  const allCriteria = tabs.flatMap((t) => t.assessedCriteria ?? []);
  if (!allCriteria.length) return null;
  if (allCriteria.some((criterion) => isFailedCriterion(criterion.level))) {
    return { grade: 'F', confidence: 'estimated', source: 'criteria' };
  }
  const levels = allCriteria
    .filter((criterion) => criterion.level?.levelEnum !== 'NO_ASSESSMENT_MADE')
    .map((c) => c.level?.value ?? 0)
    .filter((v) => Number.isFinite(v) && v >= 7);
  if (!levels.length) return null;
  const minLevel = Math.min(...levels);
  const avgLevel = levels.reduce((s, v) => s + v, 0) / levels.length;
  const effective = minLevel * 0.65 + avgLevel * 0.35;
  const grade =
    effective >= 10.5
      ? 'A'
      : effective >= 9.5
        ? 'B'
        : effective >= 8.5
          ? 'C'
          : effective >= 7.5
            ? 'D'
            : effective >= 7
              ? 'E'
              : 'F';
  return { grade, confidence: 'estimated', source: 'criteria' };
}

export function inferGrade(
  moments: PartialMoment[],
  tabs: AssessedCriteriaTab[]
): GradeInference | null {
  return inferGradeFromCriteria(tabs) ?? inferGradeFromPoints(moments);
}

/** Normalize raw SchoolSoft assessment payload */
export function normalizeAssessmentRaw(raw: unknown): {
  review: string;
  partialMoments: PartialMoment[];
  assessedCriteriaTabs: AssessedCriteriaTab[];
} {
  if (!raw || typeof raw !== 'object') {
    return { review: '', partialMoments: [], assessedCriteriaTabs: [] };
  }
  const r = raw as Record<string, unknown>;
  const moments: PartialMoment[] = [];
  const rawMoments = Array.isArray(r.assessmentPartialMoments) ? r.assessmentPartialMoments : [];
  for (const m of rawMoments as Record<string, unknown>[]) {
    if (typeof m.points === 'number' && typeof m.max === 'number') {
      moments.push({
        id: typeof m.id === 'number' ? m.id : undefined,
        name: String(m.name ?? ''),
        points: m.points,
        max: m.max,
      });
    }
  }
  const tabs = Array.isArray(r.assessedCriteriaTabs)
    ? (r.assessedCriteriaTabs as AssessedCriteriaTab[])
    : [];
  return {
    review: (r.review as string) ?? '',
    partialMoments: moments,
    assessedCriteriaTabs: tabs,
  };
}
