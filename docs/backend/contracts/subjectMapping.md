# app/api/lib/subjectMapping.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/subjectMapping.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `41b83a4186b7f3f7a8638b7f9aebbceca40de4e54e4e16c1b54625eb08ae61d2`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## fetchHolisticSubjects

```ts
export async function fetchHolisticSubjects(
  api: SchoolsoftClient,
  cookies: string,
  force = false
): Promise<SubjectResource<HolisticSubject[]>>;
```

## resolveSubjectAssessment

```ts
export async function resolveSubjectAssessment(
  api: SchoolsoftClient,
  cookies: string,
  room: { id: string; subject: string; assignmentIds: number[] },
  rows: SubjectResource<HolisticSubject[]>,
  force = false
): Promise<SubjectAssessmentLink>;
```
