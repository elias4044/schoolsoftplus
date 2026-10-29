# lib/grades/inferGrade.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/inferGrade.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `4077424a2d84816d2da63418389184d7413b548af1e30f5eefc5a37e4e7bafd2`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## inferGradeFromPoints

```ts
export function inferGradeFromPoints(moments: PartialMoment[]): GradeInference | null;
```

## inferGradeFromCriteria

```ts
export function inferGradeFromCriteria(tabs: AssessedCriteriaTab[]): GradeInference | null;
```

## inferGrade

```ts
export function inferGrade(
  moments: PartialMoment[],
  tabs: AssessedCriteriaTab[]
): GradeInference | null;
```

## normalizeAssessmentRaw

```ts
export function normalizeAssessmentRaw(raw: unknown): {
  review: string;
  partialMoments: PartialMoment[];
  assessedCriteriaTabs: AssessedCriteriaTab[];
};
```
