# lib/grades/entries.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/entries.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `91f8fab91da5a46d8c75ffa49230fee2b681cdc7407a13a25c9bcdfafd66b76a`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## createManualEntry

```ts
export function createManualEntry(title: string, grade: string, date: string): GradeEntry;
```

## updateGradeEntry

```ts
export function updateGradeEntry(entry: GradeEntry, patch: Partial<GradeEntry>): GradeEntry;
```
