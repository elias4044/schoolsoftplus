import type { FinalGradesDoc, FinalGradeSubject } from '@/lib/final-grades/types';

import { db } from './firebaseAdmin';

const COL = 'final_grades_v1';

function docId(userId: string): string {
  return userId.toLowerCase().trim();
}

function docToFinalGrades(doc: FirebaseFirestore.DocumentSnapshot): FinalGradesDoc {
  const data = doc.data() ?? {};
  return {
    userId: data.userId ?? '',
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

export async function getFinalGrades(userId: string): Promise<FinalGradesDoc | null> {
  const doc = await db.collection(COL).doc(docId(userId)).get();
  if (!doc.exists) return null;
  return docToFinalGrades(doc);
}

export async function saveFinalGrades(
  userId: string,
  subjects: FinalGradeSubject[]
): Promise<FinalGradesDoc> {
  const now = Date.now();
  const payload: FinalGradesDoc = {
    userId: docId(userId),
    subjects,
    updatedAt: now,
  };
  await db.collection(COL).doc(docId(userId)).set(payload);
  return payload;
}
