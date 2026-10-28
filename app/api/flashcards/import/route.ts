import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUsername } from '@/app/api/lib/authenticatedUser';
import {
  bulkCreateCards,
  canImportDeck,
  createDeck,
  deleteDeck,
  getCardsByDeck,
  getDeckByIdAny,
} from '@/app/api/lib/flashcardsDb';
import { assertDocumentId, readJsonObject, withValidation } from '@/app/api/lib/routeValidation';

export const POST = withValidation(async function POST(req: NextRequest) {
  const username = await getAuthenticatedUsername(req);
  if (!username)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const body = await readJsonObject(req);

  const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
  if (!deckId) {
    return NextResponse.json({ success: false, error: 'deckId is required.' }, { status: 400 });
  }

  assertDocumentId(deckId);
  if (body.messageId !== undefined) {
    if (typeof body.messageId !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid message id.' }, { status: 400 });
    }
    assertDocumentId(body.messageId);
  }

  const sourceDeck = await getDeckByIdAny(deckId);
  if (
    !sourceDeck ||
    !(await canImportDeck(sourceDeck, username, body.messageId as string | undefined))
  ) {
    return NextResponse.json(
      { success: false, error: 'Deck no longer available.' },
      { status: 404 }
    );
  }

  const sourceCards = await getCardsByDeck(deckId, sourceDeck.username);

  const newDeck = await createDeck(username, {
    title: sourceDeck.title,
    description: sourceDeck.description,
    color: sourceDeck.color,
    emoji: sourceDeck.emoji,
    subjectId: sourceDeck.subjectId,
    subjectName: sourceDeck.subjectName,
    tags: sourceDeck.tags,
  });

  const cardData = sourceCards.map((c) => ({
    front: c.front,
    back: c.back,
    hint: c.hint,
    tags: c.tags,
  }));

  if (cardData.length > 0) {
    try {
      const cards = await bulkCreateCards(newDeck.id, username, cardData);
      if (!cards)
        return NextResponse.json(
          { success: false, error: 'Deck no longer available.' },
          { status: 404 }
        );
    } catch (error) {
      await deleteDeck(newDeck.id, username);
      throw error;
    }
  }

  return NextResponse.json({
    success: true,
    deck: { ...newDeck, cardCount: cardData.length },
    cardCount: cardData.length,
  });
});
