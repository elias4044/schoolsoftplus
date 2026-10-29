# lib/final-grades/types.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/final-grades/types.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `9fbbef2827e82f30dc39b4bd93eecf32c354c1e96858573dbe7c50837363e980`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## FinalGradeLetter

```ts
export type FinalGradeLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
```

## FinalGradeCell

```ts
export interface FinalGradeCell {
  period: string;
  grade: FinalGradeLetter | null;
  isPreviousTerm: boolean;
  raw: string;
}
```

## FinalGradeSubject

```ts
export interface FinalGradeSubject {
  id: string;
  subject: string;
  grades: FinalGradeCell[];
  comment: string;
  manual: boolean;
}
```

## FinalGradesDoc

```ts
export interface FinalGradesDoc {
  userId: string;
  subjects: FinalGradeSubject[];
  updatedAt: number;
}
```

## MeritSubject

```ts
export interface MeritSubject extends FinalGradeSubject {
  currentGrade: FinalGradeLetter | null;
  currentPeriod: string | null;
  meritPoints: number;
  countsAsLanguageBonus: boolean;
  includedInBaseMerit: boolean;
}
```

## FinalGradesInsights

```ts
export interface FinalGradesInsights {
  merit: number;
  maxMerit: number;
  approvedCount: number;
  failingCount: number;
  averagePoints: number;
  gradeDistribution: Record<FinalGradeLetter, number>;
  subjects: MeritSubject[];
  includedSubjects: MeritSubject[];
  languageBonusSubject: MeritSubject | null;
  improvementCandidates: {
    subject: string;
    currentGrade: FinalGradeLetter;
    nextGrade: FinalGradeLetter;
    meritGain: number;
    reason: string;
  }[];
  decliningSubjects: {
    subject: string;
    from: FinalGradeLetter;
    to: FinalGradeLetter;
    period: string;
  }[];
}
```
