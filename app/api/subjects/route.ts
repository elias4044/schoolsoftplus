import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/lib/apiError';
import { withValidation } from '@/app/api/lib/routeValidation';
import {
  applySessionCookieUpdates,
  createSchoolsoftClient,
  requireSession,
} from '@/app/api/lib/schoolsoft';

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

  try {
    const { data: subjects } = await api.get('/rest-api/student/ps/subjectroom/all', {
      headers: { Cookie: cookies },
      responseType: 'json',
    });

    const enriched = await Promise.all(
      (subjects as { activityId: string }[]).map(async (subject) => {
        const id = subject.activityId;
        try {
          const [entitiesRes, unreadRes, teachersRes] = await Promise.all([
            api.get(`/rest-api/student/ps/subjectroom/${id}/entities`, {
              headers: { Cookie: cookies },
              responseType: 'json',
            }),
            api.get(`/rest-api/student/ps/subjectroom/${id}/unread_entities`, {
              headers: { Cookie: cookies },
              responseType: 'json',
            }),
            api.get(`/rest-api/student/ps/subjectroom/${id}/teachers`, {
              headers: { Cookie: cookies },
              responseType: 'json',
            }),
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
