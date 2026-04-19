import { NextRequest, NextResponse } from "next/server";
import { getNoteByShareToken } from "@/app/api/lib/notesDb";

/** GET /api/notes/shared/[token] — public endpoint, no auth required */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const note = await getNoteByShareToken(token);
  if (!note) return NextResponse.json({ error: "Not found or link revoked" }, { status: 404 });

  // Return public-safe shape (strip username)
  const { username: _u, shareToken: _t, ...pub } = note;
  return NextResponse.json({ success: true, note: pub });
}
