import { createSnapshot, mergeScannedEntries } from '@/lib/grades/analytics';
import { DEFAULT_SETTINGS } from '@/lib/grades/constants';
import type { GradeTrackerDoc } from '@/lib/grades/types';

import { db } from './firebaseAdmin';
import type { GradeUpdates } from './gradeValidation';

const collectionName = 'grade_tracker_v1';

function toTracker(document: FirebaseFirestore.DocumentSnapshot): GradeTrackerDoc {
  const data = document.data()!;
  return {
    userId: data.userId,
    subjectId: data.subjectId,
    subjectName: data.subjectName ?? 'Subject',
    ...(data.subjectColor !== undefined && { subjectColor: data.subjectColor }),
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    entries: data.entries ?? [],
    snapshots: data.snapshots ?? [],
    updatedAt: data.updatedAt ?? 0,
  };
}

export async function getGradeTracker(
  userId: string,
  subjectId: number
): Promise<GradeTrackerDoc | null> {
  const document = await db.collection(collectionName).doc(`${userId}_${subjectId}`).get();
  return document.exists ? toTracker(document) : null;
}

export async function updateGradeTracker(
  userId: string,
  subjectId: number,
  updates: GradeUpdates
): Promise<GradeTrackerDoc> {
  const ref = db.collection(collectionName).doc(`${userId}_${subjectId}`);
  return db.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    const tracker: GradeTrackerDoc = document.exists
      ? toTracker(document)
      : {
          userId,
          subjectId,
          subjectName: 'Subject',
          settings: { ...DEFAULT_SETTINGS },
          entries: [],
          snapshots: [],
          updatedAt: 0,
        };
    if (updates.subjectName !== undefined) tracker.subjectName = updates.subjectName;
    if (updates.subjectColor !== undefined) tracker.subjectColor = updates.subjectColor;
    if (updates.settings) tracker.settings = { ...tracker.settings, ...updates.settings };
    if (updates.scanned?.length)
      tracker.entries = mergeScannedEntries(tracker.entries, updates.scanned);
    else if (updates.entries) tracker.entries = updates.entries;
    if (updates.addSnapshot !== false && (updates.scanned?.length || updates.entries)) {
      tracker.snapshots = [
        ...tracker.snapshots,
        createSnapshot(tracker.entries, tracker.settings),
      ].slice(-50);
    }
    const previous = document.exists ? toTracker(document) : null;
    if (previous && JSON.stringify(previous) === JSON.stringify(tracker)) return previous;
    tracker.updatedAt = Date.now();
    transaction.set(ref, tracker);
    return tracker;
  });
}
