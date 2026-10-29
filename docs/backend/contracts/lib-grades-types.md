# lib/grades/types.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/types.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `0617d0747f697ac4f89db55f55deb3968f2f4b2cc24f538e24e5983e6a47a9d0`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## PartialMoment

```ts
export interface PartialMoment {
  id?: number;
  name: string;
  points: number;
  max: number;
}
```

## CriteriaLevel

```ts
export interface CriteriaLevel {
  levelEnum: string;
  value: number;
  description: string;
}
```

## CriteriaStep

```ts
export interface CriteriaStep {
  gradeCriteriaGroupId: number;
  text: string;
  level: CriteriaLevel;
}
```

## AssessedCriteria

```ts
export interface AssessedCriteria {
  level: CriteriaLevel;
  steps: CriteriaStep[];
}
```

## CriteriaTabContent

```ts
export interface CriteriaTabContent {
  type: string;
  id: number;
  typeId: number;
  name: string;
}
```

## AssessedCriteriaTab

```ts
export interface AssessedCriteriaTab {
  content: CriteriaTabContent;
  assessedCriteria: AssessedCriteria[];
}
```

## GradeInference

```ts
export interface GradeInference {
  grade: string;
  confidence: 'confirmed' | 'estimated';
  source: 'points' | 'criteria';
}
```

## GradeLetter

```ts
export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
```

## GradeTrackerSettings

```ts
export interface GradeTrackerSettings {
  targetGrade: GradeLetter;
  weightMode: 'equal' | 'recent';
  showEstimated: boolean;
  includeManual: boolean;
}
```

## GradeEntry

```ts
export interface GradeEntry {
  id: string;
  assignmentId?: number;
  title: string;
  type: string;
  endDate: string;
  source: 'scanned' | 'manual';
  reported: boolean;
  review?: string;
  grade: string;
  estimatedGrade?: string;
  confidence?: 'confirmed' | 'estimated';
  gradeSource?: 'points' | 'criteria' | 'review' | 'manual';
  totalPoints?: string;
  pointsPct?: number;
  excluded: boolean;
  notes?: string;
  customWeight?: number;
  userOverride: boolean;
  scannedAt: number;
  updatedAt: number;
}
```

## GradeSnapshot

```ts
export interface GradeSnapshot {
  at: number;
  averageNumeric: number;
  entryCount: number;
  grades: { id: string; grade: string }[];
}
```

## GradeTrackerDoc

```ts
export interface GradeTrackerDoc {
  userId: string;
  subjectId: number;
  subjectName: string;
  subjectColor?: string;
  settings: GradeTrackerSettings;
  entries: GradeEntry[];
  snapshots: GradeSnapshot[];
  updatedAt: number;
}
```

## ScannedGradeResult

```ts
export interface ScannedGradeResult {
  assignmentId: number;
  title: string;
  type: string;
  endDate: string;
  reported: boolean;
  review: string;
  estimatedGrade?: string;
  confidence?: 'confirmed' | 'estimated';
  gradeSource?: 'points' | 'criteria' | 'review';
  grade: string;
  totalPoints?: string;
  pointsPct?: number;
}
```
