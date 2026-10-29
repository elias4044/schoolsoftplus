import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/app/api/lib/authenticatedUser';
import {
  createCountdown,
  deleteCountdown,
  getCountdownsByUser,
  updateCountdown,
  type CountdownCategory,
  type CountdownTheme,
} from '@/app/api/lib/countdownsDb';
import {
  assertDocumentId,
  readJsonObject,
  validateFields,
  withValidation,
} from '@/app/api/lib/routeValidation';
import { countdownFields } from '@/app/api/lib/studyValidation';

export const GET = withValidation(async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const countdowns = await getCountdownsByUser(userId);
  return NextResponse.json({ success: true, countdowns });
});

export const POST = withValidation(async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await readJsonObject(req);

  validateFields(body, countdownFields);

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const targetDate = typeof body.targetDate === 'number' ? body.targetDate : null;
  if (targetDate === null) {
    return NextResponse.json({ error: 'targetDate (unix ms) is required' }, { status: 400 });
  }

  const countdown = await createCountdown(userId, {
    title,
    description: typeof body.description === 'string' ? body.description : '',
    targetDate,
    category: (body.category as CountdownCategory) ?? 'custom',
    theme: (body.theme as CountdownTheme) ?? 'violet',
    emoji: typeof body.emoji === 'string' ? body.emoji.slice(0, 8) : '\u23f3',
    pinned: body.pinned === true,
    archived: false,
  });

  return NextResponse.json({ success: true, countdown }, { status: 201 });
});

export const PATCH = withValidation(async function PATCH(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  assertDocumentId(id);

  const body = await readJsonObject(req);

  validateFields(body, countdownFields, true);

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.targetDate === 'number') patch.targetDate = body.targetDate;
  if (typeof body.category === 'string') patch.category = body.category;
  if (typeof body.theme === 'string') patch.theme = body.theme;
  if (typeof body.emoji === 'string') patch.emoji = body.emoji.slice(0, 8);
  if (typeof body.pinned === 'boolean') patch.pinned = body.pinned;
  if (typeof body.archived === 'boolean') patch.archived = body.archived;

  const updated = await updateCountdown(id, userId, patch);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true, countdown: updated });
});

export const DELETE = withValidation(async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  assertDocumentId(id);

  const ok = await deleteCountdown(id, userId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
});
