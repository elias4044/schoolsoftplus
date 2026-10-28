import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUsername } from '@/app/api/lib/authenticatedUser';
import { generateShareToken, revokeShareToken } from '@/app/api/lib/notesDb';
import { assertDocumentId, withValidation } from '@/app/api/lib/routeValidation';

export const POST = withValidation(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  assertDocumentId(id);
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await generateShareToken(id, username);
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, token });
});

export const DELETE = withValidation(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  assertDocumentId(id);
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ok = await revokeShareToken(id, username);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
