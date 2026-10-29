# app/api/lib/gradeValidation.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/gradeValidation.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `720b4c5d2bfd40a77215ddac765c181dce7efa1877d3882038252a8b52126910`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## validateGradeBody

```ts
export function validateGradeBody(body: Record<string, unknown>);
```

## GradeUpdates

```ts
export type GradeUpdates = {
  subjectName?: string;
  subjectColor?: string;
  settings?: Partial<import('@/lib/grades/types').GradeTrackerSettings>;
  entries?: GradeEntry[];
  scanned?: ScannedGradeResult[];
  addSnapshot?: boolean;
};
```

## Runtime validation implementation

This complete module supplies checks beyond TypeScript declarations.

```ts
import type { GradeEntry, ScannedGradeResult } from '@/lib/grades/types';

import {
  boolean,
  InputError,
  isObject,
  nonEmptyText,
  nonNegativeInteger,
  oneOf,
  text,
  validateFields,
} from './routeValidation';

const entryFields = {
  id: nonEmptyText(150),
  title: text(500),
  type: text(100),
  endDate: text(100),
  source: oneOf(['manual', 'scanned']),
  reported: boolean,
  excluded: boolean,
  userOverride: boolean,
  grade: text(40),
  estimatedGrade: text(40),
  notes: text(10_000),
  review: text(20_000),
  totalPoints: text(100),
  assignmentId: nonNegativeInteger,
  scannedAt: nonNegativeInteger,
  updatedAt: nonNegativeInteger,
  customWeight: (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000,
  pointsPct: (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
};

export function validateGradeBody(body: Record<string, unknown>) {
  validateFields(body, {
    subjectName: nonEmptyText(200),
    subjectColor: text(100),
    addSnapshot: boolean,
  });
  if (body.settings !== undefined) {
    if (!isObject(body.settings)) throw new InputError('Invalid settings');
    const fields = {
      targetGrade: oneOf(['A', 'B', 'C', 'D', 'E', 'F']),
      weightMode: oneOf(['equal', 'recent']),
      showEstimated: boolean,
      includeManual: boolean,
    };
    if (Object.keys(body.settings).some((key) => !(key in fields)))
      throw new InputError('Unknown setting');
    validateFields(body.settings, fields);
  }
  for (const key of ['entries', 'scanned']) {
    if (body[key] === undefined) continue;
    const entries = body[key];
    if (!Array.isArray(entries) || entries.length > 1000) throw new InputError(`Invalid ${key}`);
    for (const entry of entries) {
      if (!isObject(entry)) throw new InputError('Invalid grade entry');
      validateFields(entry, entryFields);
      if (typeof entry.title !== 'string' || typeof entry.grade !== 'string')
        throw new InputError('Missing grade entry fields');
      for (const field of ['type', 'endDate'])
        if (typeof entry[field] !== 'string') throw new InputError(`Missing ${field}`);
      if (typeof entry.reported !== 'boolean') throw new InputError('Missing reported status');
      if (
        key === 'entries' &&
        (!nonEmptyText(150)(entry.id) || !['scanned', 'manual'].includes(String(entry.source)))
      )
        throw new InputError('Invalid entry identity');
      if (key === 'scanned' && !nonNegativeInteger(entry.assignmentId))
        throw new InputError('Invalid assignment id');
    }
  }
  if (Buffer.byteLength(JSON.stringify(body)) > 800_000)
    throw new InputError('Grade tracker is too large', 413);
}

export type GradeUpdates = {
  subjectName?: string;
  subjectColor?: string;
  settings?: Partial<import('@/lib/grades/types').GradeTrackerSettings>;
  entries?: GradeEntry[];
  scanned?: ScannedGradeResult[];
  addSnapshot?: boolean;
};
```
