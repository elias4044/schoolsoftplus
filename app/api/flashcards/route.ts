import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { getDecksByUser, createDeck, type DeckColor } from "@/app/api/lib/flashcardsDb";

async function authenticate(req: NextRequest): Promise<string | null> {
  const sess = await requireSession(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

const VALID_COLORS: DeckColor[] = ["violet", "rose", "amber", "emerald", "sky", "slate"];

/** GET /api/flashcards — list all decks for the current user */
export async function GET(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decks = await getDecksByUser(username);
  return NextResponse.json({ success: true, decks });
}

/** POST /api/flashcards — create a new deck */
export async function POST(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const deck = await createDeck(username, {
    title,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : "",
    color: VALID_COLORS.includes(body.color as DeckColor) ? (body.color as DeckColor) : "violet",
    emoji: typeof body.emoji === "string" ? body.emoji.slice(0, 8) : "\uD83C\uDCCF",
    subjectId: typeof body.subjectId === "number" ? body.subjectId : null,
    subjectName: typeof body.subjectName === "string" ? body.subjectName.trim().slice(0, 80) : null,
    tags: Array.isArray(body.tags)
      ? (body.tags as unknown[])
          .filter(t => typeof t === "string")
          .map(t => (t as string).trim().slice(0, 40))
          .slice(0, 20)
      : [],
  });

  return NextResponse.json({ success: true, deck }, { status: 201 });
}
