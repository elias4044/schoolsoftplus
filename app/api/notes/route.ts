import { NextRequest, NextResponse } from "next/server";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { getNotesByUser, createNote } from "@/app/api/lib/notesDb";
import { trackNoteCreated } from "@/app/api/lib/statsHelper";

async function authenticate(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

/** GET /api/notes — list all notes for the current user */
export async function GET(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await getNotesByUser(username);
  return NextResponse.json({ success: true, notes });
}

/** POST /api/notes — create a new note */
export async function POST(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; content?: string; status?: string };
  try { body = await req.json(); } catch { body = {}; }

  const note = await createNote(
    username,
    body.title ?? "Untitled",
    body.content ?? "",
    (body.status as "draft" | "published" | "archived") ?? "draft"
  );
  trackNoteCreated();
  return NextResponse.json({ success: true, note }, { status: 201 });
}
