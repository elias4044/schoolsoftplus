import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { getFinalGrades, saveFinalGrades } from "@/app/api/lib/finalGradesDb";
import type { FinalGradeLetter, FinalGradeSubject } from "@/lib/final-grades/types";

const VALID_GRADES = new Set(["A", "B", "C", "D", "E", "F"]);

async function authenticate(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

function sanitizeSubjects(subjects: unknown): FinalGradeSubject[] | null {
  if (!Array.isArray(subjects)) return null;

  return subjects.slice(0, 80).map((subject, index) => {
    if (!subject || typeof subject !== "object") {
      throw new Error("Invalid subject");
    }

    const data = subject as Partial<FinalGradeSubject>;
    const name = String(data.subject ?? "").trim().slice(0, 120);
    if (!name) throw new Error("Subject name is required");

    const grades = Array.isArray(data.grades)
      ? data.grades.slice(0, 20).map((cell, cellIndex) => {
          const rawCell = cell && typeof cell === "object" ? cell as unknown as Record<string, unknown> : {};
          const rawGrade = typeof rawCell.grade === "string" ? rawCell.grade.toUpperCase() : null;
          const grade = rawGrade && VALID_GRADES.has(rawGrade) ? rawGrade as FinalGradeLetter : null;
          return {
            period: String(rawCell.period ?? `Period ${cellIndex + 1}`).slice(0, 60),
            grade,
            isPreviousTerm: Boolean(rawCell.isPreviousTerm),
            raw: String(rawCell.raw ?? "").slice(0, 20),
          };
        })
      : [];

    return {
      id: String(data.id ?? `subject-${index}`).slice(0, 140),
      subject: name,
      grades,
      comment: String(data.comment ?? "").slice(0, 1000),
      manual: Boolean(data.manual),
    };
  });
}

export async function GET(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await getFinalGrades(username);
  return NextResponse.json({ success: true, finalGrades: doc });
}

export async function PUT(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subjects?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let subjects: FinalGradeSubject[] | null;
  try {
    subjects = sanitizeSubjects(body.subjects);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid subjects" },
      { status: 400 }
    );
  }

  if (!subjects) {
    return NextResponse.json({ error: "Subjects must be an array" }, { status: 400 });
  }

  const finalGrades = await saveFinalGrades(username, subjects);
  return NextResponse.json({ success: true, finalGrades });
}
