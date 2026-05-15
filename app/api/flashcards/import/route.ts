import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { getDeckByIdAny, getCardsByDeckAny, createDeck, bulkCreateCards } from "@/app/api/lib/flashcardsDb";

/** POST /api/flashcards/import
 *  Body: { deckId: string }
 *  Duplicates the specified deck (and all its cards) into the requesting user's account.
 *  SRS progress is reset so the user starts fresh.
 */
export async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { username } = sess;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { deckId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
  if (!deckId) {
    return NextResponse.json({ success: false, error: "deckId is required." }, { status: 400 });
  }

  const sourceDeck = await getDeckByIdAny(deckId);
  if (!sourceDeck) {
    return NextResponse.json({ success: false, error: "Deck no longer available." }, { status: 404 });
  }

  // Create a copy of the deck for the requesting user
  const newDeck = await createDeck(username, {
    title:       sourceDeck.title,
    description: sourceDeck.description,
    color:       sourceDeck.color,
    emoji:       sourceDeck.emoji,
    subjectId:   sourceDeck.subjectId,
    subjectName: sourceDeck.subjectName,
    tags:        sourceDeck.tags,
  });

  // Copy all cards (SRS fields are reset by bulkCreateCards)
  const sourceCards = await getCardsByDeckAny(deckId);
  const cardData = sourceCards.map(c => ({
    front: c.front,
    back:  c.back,
    hint:  c.hint,
    tags:  c.tags,
  }));

  if (cardData.length > 0) {
    await bulkCreateCards(newDeck.id, username, cardData);
  }

  return NextResponse.json({
    success: true,
    deck: { ...newDeck, cardCount: cardData.length },
    cardCount: cardData.length,
  });
}
