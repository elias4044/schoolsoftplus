import { db } from "./firebaseAdmin";
import type { GradeTrackerDoc, GradeTrackerSettings, GradeEntry, GradeSnapshot } from "@/lib/grades/types";
import { DEFAULT_SETTINGS } from "@/lib/grades/constants";

const COL = "grade_tracker_v1";

function docId(username: string, subjectId: number): string {
  return `${username.toLowerCase().trim()}_${subjectId}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToTracker(doc: FirebaseFirestore.DocumentSnapshot<any>): GradeTrackerDoc {
  const d = doc.data()!;
  return {
    username: d.username ?? "",
    subjectId: typeof d.subjectId === "number" ? d.subjectId : 0,
    subjectName: d.subjectName ?? "",
    subjectColor: d.subjectColor,
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    entries: Array.isArray(d.entries) ? d.entries : [],
    snapshots: Array.isArray(d.snapshots) ? d.snapshots : [],
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

export async function getGradeTracker(
  username: string,
  subjectId: number
): Promise<GradeTrackerDoc | null> {
  const doc = await db.collection(COL).doc(docId(username, subjectId)).get();
  if (!doc.exists) return null;
  return docToTracker(doc);
}

export async function getOrCreateGradeTracker(
  username: string,
  subjectId: number,
  subjectName: string,
  subjectColor?: string
): Promise<GradeTrackerDoc> {
  const existing = await getGradeTracker(username, subjectId);
  if (existing) return existing;

  const now = Date.now();
  const doc: GradeTrackerDoc = {
    username: username.toLowerCase().trim(),
    subjectId,
    subjectName,
    subjectColor,
    settings: { ...DEFAULT_SETTINGS },
    entries: [],
    snapshots: [],
    updatedAt: now,
  };
  await db.collection(COL).doc(docId(username, subjectId)).set(doc);
  return doc;
}

export async function saveGradeTracker(doc: GradeTrackerDoc): Promise<GradeTrackerDoc> {
  const updatedAt = Date.now();
  const payload = { ...doc, updatedAt };
  await db.collection(COL).doc(docId(doc.username, doc.subjectId)).set(payload);
  return payload;
}

export async function updateGradeTrackerFields(
  username: string,
  subjectId: number,
  patch: Partial<{
    settings: GradeTrackerSettings;
    entries: GradeEntry[];
    snapshots: GradeSnapshot[];
    subjectName: string;
    subjectColor: string;
  }>
): Promise<GradeTrackerDoc | null> {
  const ref = db.collection(COL).doc(docId(username, subjectId));
  const existing = await ref.get();
  if (!existing.exists) return null;
  const current = docToTracker(existing);
  const updated: GradeTrackerDoc = {
    ...current,
    ...patch,
    settings: patch.settings ? { ...current.settings, ...patch.settings } : current.settings,
    updatedAt: Date.now(),
  };
  await ref.set(updated);
  return updated;
}
