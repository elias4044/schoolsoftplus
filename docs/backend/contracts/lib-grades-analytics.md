# lib/grades/analytics.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/analytics.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `68498888d645533146d058d361dda5bfea6f2ef2a929747ccaed702fc426abf5`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## GradeAnalytics

```ts
export interface GradeAnalytics {
  count: number;
  averageNumeric: number;
  averageGrade: string;
  targetGap: number;
  trendSlope: number;
  trendLabel: 'improving' | 'declining' | 'stable' | 'insufficient';
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
```

## getActiveEntries

```ts
export function getActiveEntries(
  entries: GradeEntry[],
  settings: GradeTrackerSettings
): GradeEntry[];
```

## computeAnalytics

```ts
export function computeAnalytics(
  entries: GradeEntry[],
  settings: GradeTrackerSettings
): GradeAnalytics;
```

## createSnapshot

```ts
export function createSnapshot(
  entries: GradeEntry[],
  settings: GradeTrackerSettings
): GradeSnapshot;
```

## mergeScannedEntries

```ts
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
    confidence?: 'confirmed' | 'estimated';
    gradeSource?: 'points' | 'criteria' | 'review';
    totalPoints?: string;
    pointsPct?: number;
  }[]
): GradeEntry[];
```
