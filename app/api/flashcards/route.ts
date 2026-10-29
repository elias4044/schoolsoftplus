import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/app/api/lib/authenticatedUser';
import { createDeck, getDecksByUser, type DeckColor } from '@/app/api/lib/flashcardsDb';
import { readJsonObject, validateFields, withValidation } from '@/app/api/lib/routeValidation';
import { deckFields } from '@/app/api/lib/studyValidation';

const validColors: DeckColor[] = ['violet', 'rose', 'amber', 'emerald', 'sky', 'slate'];

export const GET = withValidation(async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decks = await getDecksByUser(userId);
  return NextResponse.json({ success: true, decks });
});

export const POST = withValidation(async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await readJsonObject(req);
  validateFields(body, deckFields);

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const deck = await createDeck(userId, {
    title,
    description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '',
    color: validColors.includes(body.color as DeckColor) ? (body.color as DeckColor) : 'violet',
    emoji: typeof body.emoji === 'string' ? body.emoji.slice(0, 8) : '\uD83C\uDCCF',
    subjectId: typeof body.subjectId === 'number' ? body.subjectId : null,
    subjectName: typeof body.subjectName === 'string' ? body.subjectName.trim().slice(0, 80) : null,
    tags: Array.isArray(body.tags)
      ? (body.tags as unknown[])
          .filter((t) => typeof t === 'string')
          .map((t) => (t as string).trim().slice(0, 40))
          .slice(0, 20)
      : [],
  });

  return NextResponse.json({ success: true, deck }, { status: 201 });
});
