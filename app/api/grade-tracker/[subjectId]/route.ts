import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/app/api/lib/authenticatedUser';
import { getGradeTracker, updateGradeTracker } from '@/app/api/lib/gradeTrackerDb';
import { validateGradeBody, type GradeUpdates } from '@/app/api/lib/gradeValidation';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';

type Context = { params: Promise<{ subjectId: string }> };

export const GET = withValidation(async function GET(req: NextRequest, { params }: Context) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tracker = await getGradeTracker(userId, Number((await params).subjectId));
  return NextResponse.json({ success: true, tracker });
});

export const PUT = withValidation(async function PUT(req: NextRequest, { params }: Context) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await readRouteBody(req);
  validateGradeBody(body);
  const tracker = await updateGradeTracker(
    userId,
    Number((await params).subjectId),
    body as GradeUpdates
  );
  return NextResponse.json({ success: true, tracker });
});
