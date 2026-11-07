# app/api/lib/subjectAssessment.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/subjectAssessment.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `3c49e33d083bf56067bb8654e62ade8b4f79939482c500da4711597a6ebdabd2`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## assessmentPaths

```ts
export const assessmentPaths = {
  attendance: '/attendance/type/CURRENT_SCHOOL_YEAR?fromDate=&toDate=',
  results: '/assessed_assignments',
  criteria: '/matrix',
  criteriaOverview: '/matrix/criteria/overview',
  warning: '/subject_warning',
} as const;
```

## fetchAssessmentResource

```ts
export async function fetchAssessmentResource<T>(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  holisticId: string,
  resource: keyof typeof assessmentPaths,
  force = false
): Promise<SubjectResource<T>>;
```

## fetchSubjectAssessment

```ts
export async function fetchSubjectAssessment(
  api: ReturnType<typeof createSchoolsoftClient>,
  cookies: string,
  holisticId: string,
  force = false
): Promise<SubjectAssessment>;
```
