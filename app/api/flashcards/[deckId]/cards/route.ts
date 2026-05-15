import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { createCard, bulkCreateCards, getDeckById } from "@/app/api/lib/flashcardsDb";

async function authenticate(req: NextRequest): Promise<string | null> {
  const sess = await requireSession(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

/** POST /api/flashcards/[deckId]/cards — add one card or bulk-import an array */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId } = await params;

  // Verify deck belongs to user
  const deck = await getDeckById(deckId, username);
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  // Bulk import: body.cards is an array
  if (Array.isArray(body.cards)) {
    const items = (body.cards as unknown[])
      .filter(c => c && typeof c === "object")
      .map(c => {
        const card = c as Record<string, unknown>;
        return {
          front: typeof card.front === "string" ? card.front.trim().slice(0, 2000) : "",
          back: typeof card.back === "string" ? card.back.trim().slice(0, 2000) : "",
          hint: typeof card.hint === "string" ? card.hint.trim().slice(0, 500) : "",
          tags: Array.isArray(card.tags)
            ? (card.tags as unknown[]).filter(t => typeof t === "string").map(t => (t as string).slice(0, 40)).slice(0, 10)
            : [],
        };
      })
      .filter(c => c.front.length > 0 || c.back.length > 0)
      .slice(0, 500);

    if (items.length === 0) return NextResponse.json({ error: "No valid cards" }, { status: 400 });

    const cards = await bulkCreateCards(deckId, username, items);
    return NextResponse.json({ success: true, cards }, { status: 201 });
  }

  // Single card
  const front = typeof body.front === "string" ? body.front.trim().slice(0, 2000) : "";
  const back = typeof body.back === "string" ? body.back.trim().slice(0, 2000) : "";
  if (!front && !back) return NextResponse.json({ error: "front or back is required" }, { status: 400 });

  const card = await createCard(deckId, username, {
    front,
    back,
    hint: typeof body.hint === "string" ? body.hint.trim().slice(0, 500) : "",
    tags: Array.isArray(body.tags)
      ? (body.tags as unknown[]).filter(t => typeof t === "string").map(t => (t as string).slice(0, 40)).slice(0, 10)
      : [],
  });

  return NextResponse.json({ success: true, card }, { status: 201 });
}
