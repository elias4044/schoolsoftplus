import { NextRequest, NextResponse } from 'next/server';

import {
  deleteMessage,
  editMessage,
  getConversation,
  setMessagePinned,
  toggleReaction,
} from '@/app/api/lib/messagingDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';
import { trackReactionAdded } from '@/app/api/lib/statsHelper';

interface Params {
  params: Promise<{ conversationId: string; messageId: string }>;
}

// PATCH /api/conversations/[conversationId]/[messageId]
// Body: { action: "edit" | "pin" | "unpin", content?: string }
export const PATCH = withValidation(async function PATCH(req: NextRequest, { params }: Params) {
  const { conversationId, messageId } = await params;
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { cookieString, school, userId } = sess;

  const convo = await getConversation(conversationId);
  if (!convo || !convo.participantIds.includes(userId)) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  const body = (await readRouteBody(req)) as { action?: string; content?: string; emoji?: string };

  if (body.action === 'edit') {
    const newContent = (body.content ?? '').trim().slice(0, 2000);
    if (!newContent)
      return NextResponse.json({ success: false, error: 'Content required.' }, { status: 400 });
    const msg = await editMessage(messageId, conversationId, userId, newContent);
    if (!msg)
      return NextResponse.json(
        { success: false, error: 'Not found or forbidden.' },
        { status: 403 }
      );
    return NextResponse.json({ success: true, message: msg });
  }

  if (body.action === 'pin' || body.action === 'unpin') {
    const msg = await setMessagePinned(messageId, conversationId, userId, body.action === 'pin');
    if (!msg) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: msg });
  }

  if (body.action === 'react') {
    const emoji = (body.emoji ?? '').trim();
    if (!emoji)
      return NextResponse.json({ success: false, error: 'Emoji required.' }, { status: 400 });
    const msg = await toggleReaction(messageId, conversationId, userId, emoji);
    if (!msg) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
    trackReactionAdded();
    return NextResponse.json({ success: true, message: msg });
  }

  return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
});

// DELETE /api/conversations/[conversationId]/[messageId]
export const DELETE = withValidation(async function DELETE(req: NextRequest, { params }: Params) {
  const { conversationId, messageId } = await params;
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const { cookieString, school, userId } = sess;

  const convo = await getConversation(conversationId);
  if (!convo || !convo.participantIds.includes(userId)) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  const ok = await deleteMessage(messageId, conversationId, userId);
  if (!ok)
    return NextResponse.json({ success: false, error: 'Not found or forbidden.' }, { status: 403 });
  return NextResponse.json({ success: true });
});
