# app/api/lib/finalGradesDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/finalGradesDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `6c299966e48e9fa4c47fc9cf775a69acbf5860e4a12e913335632cc27b887b45`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## getFinalGrades

```ts
export async function getFinalGrades(userId: string): Promise<FinalGradesDoc | null>;
```

## saveFinalGrades

```ts
export async function saveFinalGrades(
  userId: string,
  subjects: FinalGradeSubject[]
): Promise<FinalGradesDoc>;
```
