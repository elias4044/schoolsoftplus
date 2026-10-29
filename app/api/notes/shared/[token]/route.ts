import { NextRequest, NextResponse } from 'next/server';

import { getNoteByShareToken } from '@/app/api/lib/notesDb';
import { InputError, withValidation } from '@/app/api/lib/routeValidation';

export const GET = withValidation(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!/^[a-f0-9]{40}$/.test(token)) throw new InputError('Invalid share token');
  const note = await getNoteByShareToken(token);
  if (!note) return NextResponse.json({ error: 'Not found or link revoked' }, { status: 404 });

  const { id, title, content, status, createdAt, updatedAt } = note;
  const pub = { id, title, content, status, createdAt, updatedAt };
  return NextResponse.json({ success: true, note: pub });
});
