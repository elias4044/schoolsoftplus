import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import {
  getConversation,
  editMessage,
  deleteMessage,
  togglePinMessage,
  toggleReaction,
} from "@/app/api/lib/messagingDb";
import { trackReactionAdded } from "@/app/api/lib/statsHelper";

interface Params { params: Promise<{ conversationId: string; messageId: string }> }

// PATCH /api/conversations/[conversationId]/[messageId]
// Body: { action: "edit" | "pin" | "unpin", content?: string }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { conversationId, messageId } = await params;
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const convo = await getConversation(conversationId);
  if (!convo || !convo.participants.includes(username)) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  let body: { action?: string; content?: string; emoji?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  if (body.action === "edit") {
    const newContent = (body.content ?? "").trim().slice(0, 2000);
    if (!newContent) return NextResponse.json({ success: false, error: "Content required." }, { status: 400 });
    const msg = await editMessage(messageId, username, newContent);
    if (!msg) return NextResponse.json({ success: false, error: "Not found or forbidden." }, { status: 403 });
    return NextResponse.json({ success: true, message: msg });
  }

  if (body.action === "pin" || body.action === "unpin") {
    const msg = await togglePinMessage(messageId, conversationId, username);
    if (!msg) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: msg });
  }

  if (body.action === "react") {
    const emoji = (body.emoji ?? "").trim();
    if (!emoji) return NextResponse.json({ success: false, error: "Emoji required." }, { status: 400 });
    const msg = await toggleReaction(messageId, conversationId, username, emoji);
    if (!msg) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    trackReactionAdded();
    return NextResponse.json({ success: true, message: msg });
  }

  return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
}

// DELETE /api/conversations/[conversationId]/[messageId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { conversationId, messageId } = await params;
  const sess = getSessionCookies(req);
  if (!sess) return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const convo = await getConversation(conversationId);
  if (!convo || !convo.participants.includes(username)) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const ok = await deleteMessage(messageId, username);
  if (!ok) return NextResponse.json({ success: false, error: "Not found or forbidden." }, { status: 403 });
  return NextResponse.json({ success: true });
}
