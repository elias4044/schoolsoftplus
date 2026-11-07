import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { InputError, withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';
import {
  assessmentPaths,
  fetchAssessmentResource,
  fetchSubjectAssessment,
} from '@/app/api/lib/subjectAssessment';

// The path identifies the room. holisticId identifies the separate assessment record.
export const GET = withValidation(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const holisticId = req.nextUrl.searchParams.get('holisticId');
  if (
    !holisticId ||
    !/^\d+$/.test(holisticId) ||
    !Number.isSafeInteger(Number(holisticId)) ||
    Number(holisticId) < 1
  ) {
    throw new InputError('A valid holisticId is required.');
  }
  const session = await requireSession(req);
  if (!session)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  try {
    const section = req.nextUrl.searchParams.get('section');
    if (section) {
      if (!Object.hasOwn(assessmentPaths, section))
        throw new InputError('Invalid assessment section.');
      const resource = await fetchAssessmentResource(
        createSchoolsoftClient(session.school),
        session.cookieString,
        holisticId,
        section as keyof typeof assessmentPaths,
        req.nextUrl.searchParams.get('refresh') === '1'
      );
      return NextResponse.json({ success: true, resource });
    }
    const assessment = await fetchSubjectAssessment(
      createSchoolsoftClient(session.school),
      session.cookieString,
      holisticId,
      req.nextUrl.searchParams.get('refresh') === '1'
    );
    return NextResponse.json({ success: true, assessment });
  } catch (error) {
    return handleApiError(error, 'subjectAssessment');
  }
});
