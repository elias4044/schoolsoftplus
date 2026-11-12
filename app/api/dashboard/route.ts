import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { InputError, withValidation } from '@/app/api/lib/routeValidation';
import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';
import { cachedSchoolsoftGet } from '@/app/api/lib/schoolsoftReadCache';
import { trackAssignmentsFetch } from '@/app/api/lib/statsHelper';

const base = '/rest-api/student/startpage';

function assignmentRange() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => Number(parts.find(({ type }) => type === name)?.value);
  const monday = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    from_date: monday.toISOString().slice(0, 10),
    to_date: sunday.toISOString().slice(0, 10),
  };
}

function getPath(resource: string | null) {
  switch (resource) {
    case 'assignments':
      return `${base}/assignments?${new URLSearchParams(assignmentRange())}`;
    case 'results':
      return `${base}/assessments?limit=6&onlyUnRead=false`;
    case 'bookings':
      return `${base}/timebooking/current?limit=6&onlyShowUnread=false`;
    default:
      throw new InputError('Invalid dashboard resource');
  }
}

export const GET = withValidation(async function GET(req: NextRequest) {
  const resource = req.nextUrl.searchParams.get('resource');
  const session = await requireSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const path = getPath(resource);
  try {
    const api = createSchoolsoftClient(session.school);
    const { data } = await cachedSchoolsoftGet(api, session.cookieString, path, {
      force: req.nextUrl.searchParams.get('refresh') === '1',
    });
    if (!Array.isArray(data)) throw new Error('Invalid SchoolSoft dashboard response');
    if (resource === 'assignments') trackAssignmentsFetch();
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleApiError(error, 'dashboard');
  }
});
