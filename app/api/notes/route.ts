import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUsername } from '@/app/api/lib/authenticatedUser';
import { createNote, getNotesByUser } from '@/app/api/lib/notesDb';
import { readJsonObject, validateFields, withValidation } from '@/app/api/lib/routeValidation';
import { trackNoteCreated } from '@/app/api/lib/statsHelper';
import { noteFields } from '@/app/api/lib/studyValidation';

export const GET = withValidation(async function GET(req: NextRequest) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notes = await getNotesByUser(username);
  return NextResponse.json({ success: true, notes });
});

export const POST = withValidation(async function POST(req: NextRequest) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await readJsonObject(req)) as { title?: string; content?: string; status?: string };
  validateFields(body, noteFields);

  const note = await createNote(
    username,
    body.title ?? 'Untitled',
    body.content ?? '',
    (body.status as 'draft' | 'published' | 'archived') ?? 'draft'
  );
  trackNoteCreated();
  return NextResponse.json({ success: true, note }, { status: 201 });
});
