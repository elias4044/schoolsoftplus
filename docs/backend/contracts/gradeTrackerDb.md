# app/api/lib/gradeTrackerDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/gradeTrackerDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `2b6c86f7ee40bda9e9678e7cff1b95e8710a3d4a95922f4c22a8f369ffc41165`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## getGradeTracker

```ts
export async function getGradeTracker(
  userId: string,
  subjectId: number
): Promise<GradeTrackerDoc | null>;
```

## updateGradeTracker

```ts
export async function updateGradeTracker(
  userId: string,
  subjectId: number,
  updates: GradeUpdates
): Promise<GradeTrackerDoc>;
```
