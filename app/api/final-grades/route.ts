import { NextRequest, NextResponse } from 'next/server';

import type { FinalGradeLetter, FinalGradeSubject } from '@/lib/final-grades/types';
import { getAuthenticatedUserId as authenticate } from '@/app/api/lib/authenticatedUser';
import { getFinalGrades, saveFinalGrades } from '@/app/api/lib/finalGradesDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';

const VALID_GRADES = new Set(['A', 'B', 'C', 'D', 'E', 'F']);

function sanitizeSubjects(subjects: unknown): FinalGradeSubject[] | null {
  if (!Array.isArray(subjects)) return null;
  if (subjects.length > 80) throw new Error('Too many subjects');

  return subjects.slice(0, 80).map((subject, index) => {
    if (!subject || typeof subject !== 'object') {
      throw new Error('Invalid subject');
    }

    const data = subject as Partial<FinalGradeSubject>;
    if (
      typeof data.subject !== 'string' ||
      (data.comment !== undefined && typeof data.comment !== 'string') ||
      (data.id !== undefined && typeof data.id !== 'string')
    )
      throw new Error('Invalid subject fields');
    if (data.grades !== undefined && (!Array.isArray(data.grades) || data.grades.length > 20))
      throw new Error('Invalid grade cells');
    const name = String(data.subject ?? '')
      .trim()
      .slice(0, 120);
    if (!name) throw new Error('Subject name is required');

    const grades = Array.isArray(data.grades)
      ? data.grades.slice(0, 20).map((cell, cellIndex) => {
          const rawCell =
            cell && typeof cell === 'object' ? (cell as unknown as Record<string, unknown>) : {};
          const rawGrade = typeof rawCell.grade === 'string' ? rawCell.grade.toUpperCase() : null;
          const grade =
            rawGrade && VALID_GRADES.has(rawGrade) ? (rawGrade as FinalGradeLetter) : null;
          return {
            period: String(rawCell.period ?? `Period ${cellIndex + 1}`).slice(0, 60),
            grade,
            isPreviousTerm: Boolean(rawCell.isPreviousTerm),
            raw: String(rawCell.raw ?? '').slice(0, 20),
          };
        })
      : [];

    return {
      id: String(data.id ?? `subject-${index}`).slice(0, 140),
      subject: name,
      grades,
      comment: String(data.comment ?? '').slice(0, 1000),
      manual: Boolean(data.manual),
    };
  });
}

export const GET = withValidation(async function GET(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const doc = await getFinalGrades(userId);
  return NextResponse.json({ success: true, finalGrades: doc });
});

export const PUT = withValidation(async function PUT(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await readRouteBody(req)) as { subjects?: unknown };

  let subjects: FinalGradeSubject[] | null;
  try {
    subjects = sanitizeSubjects(body.subjects);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid subjects' },
      { status: 400 }
    );
  }

  if (!subjects) {
    return NextResponse.json({ error: 'Subjects must be an array' }, { status: 400 });
  }

  const finalGrades = await saveFinalGrades(userId, subjects);
  return NextResponse.json({ success: true, finalGrades });
});
