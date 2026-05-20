import type { GradeEntry, GradeSnapshot, GradeTrackerSettings } from "./types";
import { gradeToNumeric, numericToGrade, GRADE_LETTERS } from "./constants";

export interface GradeAnalytics {
  count: number;
  averageNumeric: number;
  averageGrade: string;
  targetGap: number;
  trendSlope: number;
  trendLabel: "improving" | "declining" | "stable" | "insufficient";
  bestEntry: GradeEntry | null;
  worstEntry: GradeEntry | null;
  distribution: Record<string, number>;
  recentChange: number | null;
  volatility: number;
  streakUp: number;
  streakDown: number;
  timeline: { label: string; numeric: number; grade: string; date: string }[];
  movingAvg: number[];
}

function entryWeight(entry: GradeEntry, index: number, total: number, mode: GradeTrackerSettings["weightMode"]): number {
  if (entry.customWeight != null && entry.customWeight > 0) return entry.customWeight;
  if (mode === "recent" && total > 1) {
    return 0.5 + (index / (total - 1)) * 0.5;
  }
  return 1;
}

export function getActiveEntries(entries: GradeEntry[], settings: GradeTrackerSettings): GradeEntry[] {
  return entries
    .filter(e => !e.excluded)
    .filter(e => settings.includeManual || e.source === "scanned")
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
}

export function computeAnalytics(
  entries: GradeEntry[],
  settings: GradeTrackerSettings
): GradeAnalytics {
  const active = getActiveEntries(entries, settings);
  const timeline = active
    .map(e => {
      const n = gradeToNumeric(e.grade);
      if (n == null) return null;
      const d = new Date(e.endDate);
      return {
        label: e.title.length > 18 ? `${e.title.slice(0, 16)}…` : e.title,
        numeric: n,
        grade: e.grade.toUpperCase(),
        date: Number.isNaN(d.getTime()) ? e.endDate : d.toISOString(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const distribution: Record<string, number> = {};
  for (const l of GRADE_LETTERS) distribution[l] = 0;

  if (!timeline.length) {
    return {
      count: 0,
      averageNumeric: 0,
      averageGrade: "—",
      targetGap: 0,
      trendSlope: 0,
      trendLabel: "insufficient",
      bestEntry: null,
      worstEntry: null,
      distribution,
      recentChange: null,
      volatility: 0,
      streakUp: 0,
      streakDown: 0,
      timeline: [],
      movingAvg: [],
    };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  active.forEach((e, i) => {
    const n = gradeToNumeric(e.grade);
    if (n == null) return;
    const w = entryWeight(e, i, active.length, settings.weightMode);
    weightedSum += n * w;
    weightTotal += w;
    const g = e.grade.toUpperCase().charAt(0);
    if (g in distribution) distribution[g]++;
  });

  const averageNumeric = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const averageGrade = numericToGrade(averageNumeric);
  const targetN = gradeToNumeric(settings.targetGrade) ?? 15;
  const targetGap = averageNumeric - targetN;

  const numerics = timeline.map(t => t.numeric);
  const movingAvg: number[] = [];
  for (let i = 0; i < numerics.length; i++) {
    const window = numerics.slice(Math.max(0, i - 2), i + 1);
    movingAvg.push(window.reduce((a, b) => a + b, 0) / window.length);
  }

  let trendSlope = 0;
  if (numerics.length >= 2) {
    const n = numerics.length;
    const xMean = (n - 1) / 2;
    const yMean = numerics.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (numerics[i] - yMean);
      den += (i - xMean) ** 2;
    }
    trendSlope = den > 0 ? num / den : 0;
  }

  const trendLabel: GradeAnalytics["trendLabel"] =
    numerics.length < 2 ? "insufficient" :
    trendSlope > 0.4 ? "improving" :
    trendSlope < -0.4 ? "declining" : "stable";

  const mean = numerics.reduce((a, b) => a + b, 0) / numerics.length;
  const volatility =
    numerics.length < 2
      ? 0
      : Math.sqrt(numerics.reduce((s, v) => s + (v - mean) ** 2, 0) / numerics.length);

  const recentChange =
    numerics.length >= 2 ? numerics[numerics.length - 1] - numerics[numerics.length - 2] : null;

  let streakUp = 0;
  let streakDown = 0;
  for (let i = numerics.length - 1; i > 0; i--) {
    if (numerics[i] > numerics[i - 1]) streakUp++;
    else break;
  }
  for (let i = numerics.length - 1; i > 0; i--) {
    if (numerics[i] < numerics[i - 1]) streakDown++;
    else break;
  }

  const ranked = [...active].sort((a, b) => (gradeToNumeric(b.grade) ?? 0) - (gradeToNumeric(a.grade) ?? 0));

  return {
    count: active.length,
    averageNumeric,
    averageGrade,
    targetGap,
    trendSlope,
    trendLabel,
    bestEntry: ranked[0] ?? null,
    worstEntry: ranked[ranked.length - 1] ?? null,
    distribution,
    recentChange,
    volatility,
    streakUp,
    streakDown,
    timeline,
    movingAvg,
  };
}

export function createSnapshot(entries: GradeEntry[], settings: GradeTrackerSettings): GradeSnapshot {
  const analytics = computeAnalytics(entries, settings);
  const active = getActiveEntries(entries, settings);
  return {
    at: Date.now(),
    averageNumeric: analytics.averageNumeric,
    entryCount: analytics.count,
    grades: active.map(e => ({ id: e.id, grade: e.grade })),
  };
}

export function mergeScannedEntries(
  existing: GradeEntry[],
  scanned: {
    assignmentId: number;
    title: string;
    type: string;
    endDate: string;
    reported: boolean;
    review: string;
    grade: string;
    estimatedGrade?: string;
    confidence?: "confirmed" | "estimated";
    gradeSource?: "points" | "criteria" | "review";
    totalPoints?: string;
    pointsPct?: number;
  }[]
): GradeEntry[] {
  const byId = new Map(existing.map(e => [e.id, e]));
  const now = Date.now();

  for (const s of scanned) {
    const id = String(s.assignmentId);
    const prev = byId.get(id);
    if (prev?.userOverride) {
      byId.set(id, {
        ...prev,
        title: s.title,
        type: s.type,
        endDate: s.endDate,
        reported: s.reported,
        review: s.review || prev.review,
        estimatedGrade: s.estimatedGrade,
        confidence: s.confidence,
        gradeSource: s.gradeSource,
        totalPoints: s.totalPoints,
        pointsPct: s.pointsPct,
        scannedAt: now,
        updatedAt: now,
      });
    } else {
      byId.set(id, {
        id,
        assignmentId: s.assignmentId,
        title: s.title,
        type: s.type,
        endDate: s.endDate,
        source: "scanned",
        reported: s.reported,
        review: s.review,
        grade: prev?.grade && prev.userOverride ? prev.grade : s.grade,
        estimatedGrade: s.estimatedGrade,
        confidence: s.confidence,
        gradeSource: s.gradeSource,
        totalPoints: s.totalPoints,
        pointsPct: s.pointsPct,
        excluded: prev?.excluded ?? false,
        notes: prev?.notes,
        customWeight: prev?.customWeight,
        userOverride: prev?.userOverride ?? false,
        scannedAt: now,
        updatedAt: now,
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );
}
