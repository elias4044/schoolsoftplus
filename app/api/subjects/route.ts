import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { InputError, withValidation } from '@/app/api/lib/routeValidation';
import {
  applySessionCookieUpdates,
  createSchoolsoftClient,
  requireSession,
} from '@/app/api/lib/schoolsoft';
import { cachedSchoolsoftGet } from '@/app/api/lib/schoolsoftReadCache';

type SubjectEntity = {
  planningId?: string;
  [key: string]: unknown;
};

// -- GET /api/subjects  --------------------------------------------------------
// Returns all subjects, each enriched with entities, unread counts, and teachers.
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const { cookieString: cookies, school } = sess;

  const api = createSchoolsoftClient(school);
  const view = req.nextUrl.searchParams.get('view');
  if (view && !['catalog', 'directory'].includes(view))
    throw new InputError('Invalid subjects view');
  const get = (path: string) =>
    cachedSchoolsoftGet(api, cookies, path, {
      maxAge: 60_000,
      force: req.nextUrl.searchParams.get('refresh') === '1',
    });

  try {
    const { data: subjects } = await get('/rest-api/student/ps/subjectroom/all');
    if (view === 'catalog') {
      return NextResponse.json({
        success: true,
        subjects: (subjects as { activityId: string }[]).map((subject) => ({
          ...subject,
          id: subject.activityId,
          teachers: [],
        })),
      });
    }

    const enrichSubject = async (subject: { activityId: string }) => {
      const id = subject.activityId;
      try {
        const [entitiesRes, unreadRes, teachersRes] = await Promise.all([
          view === 'directory'
            ? Promise.resolve({ data: [] })
            : get(`/rest-api/student/ps/subjectroom/${id}/entities`),
          get(`/rest-api/student/ps/subjectroom/${id}/unread_entities`),
          get(`/rest-api/student/ps/subjectroom/${id}/teachers`),
        ]);

        const entities = (entitiesRes.data as SubjectEntity[]).map((e) => ({
          ...e,
          entityType: e.planningId ? 'PLANNING' : 'ASSIGNMENT',
        }));

        return {
          ...subject,
          id,
          entities,
          unreadEntities: parseInt(String(unreadRes.data), 10),
          teachers: teachersRes.data,
        };
      } catch (err) {
        console.error(
          `[subjects] Failed to fetch details for subject ${id}:`,
          (err as Error).message
        );
        return { ...subject, id, entities: [], unreadEntities: 0, teachers: [] };
      }
    };
    const rows = subjects as { activityId: string }[];
    const enriched: unknown[] = new Array(rows.length);
    let nextIndex = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, rows.length) }, async () => {
        while (nextIndex < rows.length) {
          const index = nextIndex++;
          enriched[index] = await enrichSubject(rows[index]);
        }
      })
    );

    const res = NextResponse.json({ success: true, subjects: enriched });
    applySessionCookieUpdates(res, sess.cookieUpdates ?? null);
    return res;
  } catch (error) {
    const errRes = handleApiError(error, 'subjects');
    applySessionCookieUpdates(errRes as NextResponse, sess?.cookieUpdates ?? null);
    return errRes;
  }
});
