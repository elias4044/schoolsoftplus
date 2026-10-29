import { NextRequest, NextResponse } from 'next/server';

import { searchUsers } from '@/app/api/lib/messagingDb';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

// GET /api/users/search?q=query
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { userId: username } = sess;

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ success: true, users: [] });

  const users = await searchUsers(q, username);
  return NextResponse.json({ success: true, users });
});
