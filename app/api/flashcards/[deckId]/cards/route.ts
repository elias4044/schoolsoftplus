import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUsername } from '@/app/api/lib/authenticatedUser';
import { bulkCreateCards, createCard, getDeckById } from '@/app/api/lib/flashcardsDb';
import {
  assertDocumentId,
  InputError,
  readJsonObject,
  withValidation,
} from '@/app/api/lib/routeValidation';
import { parseCardInput } from '@/app/api/lib/studyValidation';

export const POST = withValidation(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await getAuthenticatedUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deckId } = await params;
  assertDocumentId(deckId);
  const deck = await getDeckById(deckId, username);
  if (!deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 });

  const body = await readJsonObject(req);
  if ('cards' in body) {
    if (!Array.isArray(body.cards) || body.cards.length === 0 || body.cards.length > 500) {
      throw new InputError('cards must contain between 1 and 500 items');
    }
    const items = body.cards.map(parseCardInput);
    const cards = await bulkCreateCards(deckId, username, items);
    if (!cards) return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    return NextResponse.json({ success: true, cards }, { status: 201 });
  }

  const card = await createCard(deckId, username, parseCardInput(body));
  if (!card) return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  return NextResponse.json({ success: true, card }, { status: 201 });
});
