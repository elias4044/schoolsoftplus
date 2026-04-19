import { NextRequest, NextResponse } from "next/server";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import {
  getCountdownsByUser,
  createCountdown,
  updateCountdown,
  deleteCountdown,
  type CountdownCategory,
  type CountdownTheme,
} from "@/app/api/lib/countdownsDb";

/* ---------------------------------------------------------- */
/*  Auth helper                                                 */
/* ---------------------------------------------------------- */

async function authenticate(req: NextRequest): Promise<string | null> {
  const sess = getSessionCookies(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

/* ---------------------------------------------------------- */
/*  GET /api/countdowns                                         */
/* ---------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const countdowns = await getCountdownsByUser(username);
  return NextResponse.json({ success: true, countdowns });
}

/* ---------------------------------------------------------- */
/*  POST /api/countdowns  — create                             */
/* ---------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const targetDate = typeof body.targetDate === "number" ? body.targetDate : null;
  if (!targetDate || isNaN(targetDate)) {
    return NextResponse.json({ error: "targetDate (unix ms) is required" }, { status: 400 });
  }

  const countdown = await createCountdown(username, {
    title,
    description: typeof body.description === "string" ? body.description : "",
    targetDate,
    category: (body.category as CountdownCategory) ?? "custom",
    theme: (body.theme as CountdownTheme) ?? "violet",
    emoji: typeof body.emoji === "string" ? body.emoji.slice(0, 4) : "⏳",
    pinned: body.pinned === true,
    archived: false,
  });

  return NextResponse.json({ success: true, countdown }, { status: 201 });
}

/* ---------------------------------------------------------- */
/*  PATCH /api/countdowns?id=xxx  — update                     */
/* ---------------------------------------------------------- */

export async function PATCH(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  // Sanitise patch fields — only allow known keys through
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string")       patch.title       = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.targetDate === "number")  patch.targetDate  = body.targetDate;
  if (typeof body.category === "string")    patch.category    = body.category;
  if (typeof body.theme === "string")       patch.theme       = body.theme;
  if (typeof body.emoji === "string")       patch.emoji       = body.emoji.slice(0, 4);
  if (typeof body.pinned === "boolean")     patch.pinned      = body.pinned;
  if (typeof body.archived === "boolean")   patch.archived    = body.archived;

  const updated = await updateCountdown(id, username, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, countdown: updated });
}

/* ---------------------------------------------------------- */
/*  DELETE /api/countdowns?id=xxx                              */
/* ---------------------------------------------------------- */

export async function DELETE(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const ok = await deleteCountdown(id, username);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
