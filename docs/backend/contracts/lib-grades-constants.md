# lib/grades/constants.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/constants.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `6b4b9fe83c6f333232ebbd7ddd7f5c96d8310b2eaa8e548a04a542f5d3b928f8`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## GRADE_LETTERS

```ts
export const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
```

## GRADE_NUMERIC

```ts
export const GRADE_NUMERIC: Record<string, number> = {
  A: 20,
  B: 17.5,
  C: 15,
  D: 12.5,
  E: 10,
  F: 0,
};
```

## DEFAULT_SETTINGS

```ts
export const DEFAULT_SETTINGS = {
  targetGrade: 'C' as const,
  weightMode: 'equal' as const,
  showEstimated: true,
  includeManual: true,
};
```

## OVERALL_GRADE_STYLE

```ts
export const OVERALL_GRADE_STYLE: Record<
  string,
  { bg: string; color: string; border: string; glow: string }
> = {
  A: {
    bg: 'oklch(0.65 0.22 278 / 18%)',
    color: 'oklch(0.80 0.18 278)',
    border: 'oklch(0.65 0.22 278 / 40%)',
    glow: 'oklch(0.65 0.22 278 / 22%)',
  },
  B: {
    bg: 'oklch(0.65 0.20 245 / 18%)',
    color: 'oklch(0.78 0.17 245)',
    border: 'oklch(0.65 0.20 245 / 40%)',
    glow: 'oklch(0.65 0.20 245 / 22%)',
  },
  C: {
    bg: 'oklch(0.65 0.18 210 / 18%)',
    color: 'oklch(0.78 0.16 210)',
    border: 'oklch(0.65 0.18 210 / 40%)',
    glow: 'oklch(0.65 0.18 210 / 22%)',
  },
  D: {
    bg: 'oklch(0.65 0.20 175 / 18%)',
    color: 'oklch(0.75 0.18 175)',
    border: 'oklch(0.65 0.20 175 / 40%)',
    glow: 'oklch(0.65 0.20 175 / 22%)',
  },
  E: {
    bg: 'oklch(0.65 0.22 148 / 18%)',
    color: 'oklch(0.72 0.18 148)',
    border: 'oklch(0.65 0.22 148 / 40%)',
    glow: 'oklch(0.65 0.22 148 / 22%)',
  },
  F: {
    bg: 'oklch(1 0 0 / 6%)',
    color: 'oklch(0.55 0 0)',
    border: 'oklch(1 0 0 / 12%)',
    glow: 'oklch(1 0 0 / 8%)',
  },
};
```

## gradeToNumeric

```ts
export function gradeToNumeric(grade: string): number | null;
```

## numericToGrade

```ts
export function numericToGrade(n: number): string;
```

## parseGradeFromReview

```ts
export function parseGradeFromReview(review: string): string | null;
```
