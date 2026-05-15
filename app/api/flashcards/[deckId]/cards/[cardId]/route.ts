import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { updateCard, deleteCard } from "@/app/api/lib/flashcardsDb";

async function authenticate(req: NextRequest): Promise<string | null> {
  const sess = await requireSession(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

/** PATCH /api/flashcards/[deckId]/cards/[cardId] — update card content or record a study review */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const updates: Parameters<typeof updateCard>[2] = {};

  // Content updates
  if (typeof body.front === "string") updates.front = body.front.trim().slice(0, 2000);
  if (typeof body.back === "string") updates.back = body.back.trim().slice(0, 2000);
  if (typeof body.hint === "string") updates.hint = body.hint.trim().slice(0, 500);
  if (Array.isArray(body.tags)) {
    updates.tags = (body.tags as unknown[])
      .filter(t => typeof t === "string")
      .map(t => (t as string).slice(0, 40))
      .slice(0, 10);
  }

  // SM-2 review fields (sent after a study session rating)
  if (typeof body.repetitions === "number") updates.repetitions = Math.max(0, Math.floor(body.repetitions));
  if (typeof body.easeFactor === "number") updates.easeFactor = Math.max(1.3, Math.min(4.0, body.easeFactor));
  if (typeof body.interval === "number") updates.interval = Math.max(1, Math.floor(body.interval));
  if (typeof body.nextReview === "number") updates.nextReview = body.nextReview;
  if (typeof body.lastReview === "number") updates.lastReview = body.lastReview;

  const card = await updateCard(cardId, username, updates);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, card });
}

/** DELETE /api/flashcards/[deckId]/cards/[cardId] — remove a card */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId, cardId } = await params;
  const ok = await deleteCard(cardId, deckId, username);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
