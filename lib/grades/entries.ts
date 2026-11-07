import type { GradeEntry } from './types';

export function createManualEntry(title: string, grade: string, date: string): GradeEntry {
  const now = Date.now();
  return {
    id: `manual-${crypto.randomUUID()}`,
    title: title.trim(),
    type: 'Manual',
    endDate: date,
    source: 'manual',
    reported: false,
    grade,
    gradeSource: 'manual',
    excluded: false,
    userOverride: true,
    scannedAt: now,
    updatedAt: now,
  };
}

export function updateGradeEntry(entry: GradeEntry, patch: Partial<GradeEntry>): GradeEntry {
  return {
    ...entry,
    ...patch,
    updatedAt: Date.now(),
    userOverride: patch.grade ? true : entry.userOverride,
  };
}
