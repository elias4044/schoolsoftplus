import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import {
  getDeckById,
  updateDeck,
  deleteDeck,
  getCardsByDeck,
  type DeckColor,
} from "@/app/api/lib/flashcardsDb";

async function authenticate(req: NextRequest): Promise<string | null> {
  const sess = await requireSession(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

const VALID_COLORS: DeckColor[] = ["violet", "rose", "amber", "emerald", "sky", "slate"];

/** GET /api/flashcards/[deckId] — get deck with all its cards */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId } = await params;
  const deck = await getDeckById(deckId, username);
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cards = await getCardsByDeck(deckId, username);
  return NextResponse.json({ success: true, deck, cards });
}

/** PATCH /api/flashcards/[deckId] — update deck metadata */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const updates: Parameters<typeof updateDeck>[2] = {};
  if (typeof body.title === "string") updates.title = body.title.trim().slice(0, 120);
  if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 500);
  if (VALID_COLORS.includes(body.color as DeckColor)) updates.color = body.color as DeckColor;
  if (typeof body.emoji === "string") updates.emoji = body.emoji.slice(0, 8);
  if (body.subjectId === null || typeof body.subjectId === "number") updates.subjectId = body.subjectId as number | null;
  if (body.subjectName === null || typeof body.subjectName === "string") {
    updates.subjectName = typeof body.subjectName === "string" ? body.subjectName.trim().slice(0, 80) : null;
  }
  if (Array.isArray(body.tags)) {
    updates.tags = (body.tags as unknown[])
      .filter(t => typeof t === "string")
      .map(t => (t as string).trim().slice(0, 40))
      .slice(0, 20);
  }

  const deck = await updateDeck(deckId, username, updates);
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, deck });
}

/** DELETE /api/flashcards/[deckId] — delete deck and all its cards */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId } = await params;
  const ok = await deleteDeck(deckId, username);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
