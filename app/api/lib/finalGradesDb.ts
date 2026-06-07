import { db } from "./firebaseAdmin";
import type { FinalGradesDoc, FinalGradeSubject } from "@/lib/final-grades/types";

const COL = "final_grades_v1";

function docId(username: string): string {
  return username.toLowerCase().trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToFinalGrades(doc: FirebaseFirestore.DocumentSnapshot<any>): FinalGradesDoc {
  const data = doc.data() ?? {};
  return {
    username: data.username ?? "",
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

export async function getFinalGrades(username: string): Promise<FinalGradesDoc | null> {
  const doc = await db.collection(COL).doc(docId(username)).get();
  if (!doc.exists) return null;
  return docToFinalGrades(doc);
}

export async function saveFinalGrades(
  username: string,
  subjects: FinalGradeSubject[]
): Promise<FinalGradesDoc> {
  const now = Date.now();
  const payload: FinalGradesDoc = {
    username: docId(username),
    subjects,
    updatedAt: now,
  };
  await db.collection(COL).doc(docId(username)).set(payload);
  return payload;
}
