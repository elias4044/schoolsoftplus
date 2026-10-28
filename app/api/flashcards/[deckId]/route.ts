import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUsername } from '@/app/api/lib/authenticatedUser';
import {
  deleteDeck,
  getCardsByDeck,
  getDeckById,
  updateDeck,
  type DeckColor,
} from '@/app/api/lib/flashcardsDb';
import {
  assertDocumentId,
  readJsonObject,
  validateFields,
  withValidation,
} from '@/app/api/lib/routeValidation';
import { deckFields } from '@/app/api/lib/studyValidation';

const validColors: DeckColor[] = ['violet', 'rose', 'amber', 'emerald', 'sky', 'slate'];

export const GET = withValidation(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deckId } = await params;
  assertDocumentId(deckId);
  const deck = await getDeckById(deckId, username);
  if (!deck) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const cards = await getCardsByDeck(deckId, username);
  return NextResponse.json({ success: true, deck, cards });
});

export const PATCH = withValidation(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deckId } = await params;
  assertDocumentId(deckId);

  const body = await readJsonObject(req);
  validateFields(body, deckFields, true);

  const updates: Parameters<typeof updateDeck>[2] = {};
  if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 120);
  if (typeof body.description === 'string')
    updates.description = body.description.trim().slice(0, 500);
  if (validColors.includes(body.color as DeckColor)) updates.color = body.color as DeckColor;
  if (typeof body.emoji === 'string') updates.emoji = body.emoji.slice(0, 8);
  if (body.subjectId === null || typeof body.subjectId === 'number')
    updates.subjectId = body.subjectId as number | null;
  if (body.subjectName === null || typeof body.subjectName === 'string') {
    updates.subjectName =
      typeof body.subjectName === 'string' ? body.subjectName.trim().slice(0, 80) : null;
  }
  if (Array.isArray(body.tags)) {
    updates.tags = (body.tags as unknown[])
      .filter((t) => typeof t === 'string')
      .map((t) => (t as string).trim().slice(0, 40))
      .slice(0, 20);
  }

  const deck = await updateDeck(deckId, username, updates);
  if (!deck) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true, deck });
});

export const DELETE = withValidation(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deckId } = await params;
  assertDocumentId(deckId);
  const ok = await deleteDeck(deckId, username);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
});
