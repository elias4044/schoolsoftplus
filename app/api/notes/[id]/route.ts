import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/app/api/lib/authenticatedUser';
import { deleteNote, getNoteById, updateNote } from '@/app/api/lib/notesDb';
import {
  assertDocumentId,
  readJsonObject,
  validateFields,
  withValidation,
} from '@/app/api/lib/routeValidation';
import { noteFields } from '@/app/api/lib/studyValidation';

export const GET = withValidation(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  assertDocumentId(id);
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const note = await getNoteById(id, userId);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, note });
});

export const PUT = withValidation(async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  assertDocumentId(id);
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await readJsonObject(req)) as { title?: string; content?: string; status?: string };
  validateFields(body, noteFields, true);

  const note = await updateNote(id, userId, {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.content !== undefined && { content: body.content }),
    ...(body.status !== undefined && { status: body.status as 'draft' | 'published' | 'archived' }),
  });
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, note });
});

export const DELETE = withValidation(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  assertDocumentId(id);
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ok = await deleteNote(id, userId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
