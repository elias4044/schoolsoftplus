import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUsername } from '@/app/api/lib/authenticatedUser';
import { deleteCard, updateCard } from '@/app/api/lib/flashcardsDb';
import {
  assertDocumentId,
  readJsonObject,
  validateFields,
  withValidation,
} from '@/app/api/lib/routeValidation';
import { cardFields, reviewFields } from '@/app/api/lib/studyValidation';

export const PATCH = withValidation(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deckId, cardId } = await params;
  assertDocumentId(deckId);
  assertDocumentId(cardId);

  const body = await readJsonObject(req);

  validateFields(body, { ...cardFields, ...reviewFields }, true);

  const updates: Parameters<typeof updateCard>[3] = {};

  if (typeof body.front === 'string') updates.front = body.front.trim().slice(0, 2000);
  if (typeof body.back === 'string') updates.back = body.back.trim().slice(0, 2000);
  if (typeof body.hint === 'string') updates.hint = body.hint.trim().slice(0, 500);
  if (Array.isArray(body.tags)) {
    updates.tags = (body.tags as unknown[])
      .filter((t) => typeof t === 'string')
      .map((t) => (t as string).slice(0, 40))
      .slice(0, 10);
  }

  if (typeof body.repetitions === 'number')
    updates.repetitions = Math.max(0, Math.floor(body.repetitions));
  if (typeof body.easeFactor === 'number')
    updates.easeFactor = Math.max(1.3, Math.min(4.0, body.easeFactor));
  if (typeof body.interval === 'number') updates.interval = Math.max(1, Math.floor(body.interval));
  if (typeof body.nextReview === 'number') updates.nextReview = body.nextReview;
  if (body.lastReview === null || typeof body.lastReview === 'number')
    updates.lastReview = body.lastReview;

  const card = await updateCard(cardId, deckId, username, updates);
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true, card });
});

export const DELETE = withValidation(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deckId, cardId } = await params;
  assertDocumentId(deckId);
  assertDocumentId(cardId);
  const ok = await deleteCard(cardId, deckId, username);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
});
