import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import {
  getConversation,
  getMessages,
  getPinnedMessages,
  createMessage,
  ReplyTo,
} from "@/app/api/lib/messagingDb";
import { getProfile } from "@/app/api/lib/profileDb";
import { trackMessageSent } from "@/app/api/lib/statsHelper";

interface Params { params: Promise<{ conversationId: string }> }

// GET /api/conversations/[conversationId]?pinned=true
export async function GET(req: NextRequest, { params }: Params) {
  const { conversationId } = await params;
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

  const pinned = req.nextUrl.searchParams.get("pinned") === "true";
  const messages = pinned
    ? await getPinnedMessages(conversationId)
    : await getMessages(conversationId);

  return NextResponse.json({ success: true, messages });
}

// POST /api/conversations/[conversationId]  – send a message
// Body: { content: string }
export async function POST(req: NextRequest, { params }: Params) {
  const { conversationId } = await params;
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

  let body: { content?: string; replyTo?: ReplyTo } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const content = (body.content ?? "").trim().slice(0, 2000);
  if (!content) return NextResponse.json({ success: false, error: "Message is empty." }, { status: 400 });

  const replyTo = body.replyTo
    ? {
        messageId:          String(body.replyTo.messageId ?? "").slice(0, 100),
        content:            String(body.replyTo.content ?? "").slice(0, 200),
        senderDisplayName:  String(body.replyTo.senderDisplayName ?? "").slice(0, 100),
      }
    : null;

  const profile = await getProfile(username);
  const senderDisplayName =
    profile?.displayName ||
    `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
    username;

  const message = await createMessage(conversationId, username, senderDisplayName, content, replyTo);
  trackMessageSent();
  return NextResponse.json({ success: true, message });
}
