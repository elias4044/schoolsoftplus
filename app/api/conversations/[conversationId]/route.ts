import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import {
  getConversation,
  getMessages,
  getPinnedMessages,
  createMessage,
  updateGroupInfo,
  addGroupMember,
  removeGroupMember,
  transferGroupAdmin,
  ReplyTo,
  ShareCard,
} from "@/app/api/lib/messagingDb";
import { getProfile } from "@/app/api/lib/profileDb";
import { getNoteById } from "@/app/api/lib/notesDb";
import { trackMessageSent } from "@/app/api/lib/statsHelper";
import { createSchoolsoftClient } from "@/app/api/lib/schoolsoft";

interface Params { params: Promise<{ conversationId: string }> }

/** Strip markdown for note preview */
function stripMd(md: string) {
  return md
    .replace(/[#*_`~>[\]!]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Server-side: build a verified NoteShareCard */
async function buildNoteCard(noteId: string, username: string): Promise<ShareCard | null> {
  const note = await getNoteById(noteId, username);
  if (!note) return null;
  return {
    type: "note",
    noteId: note.id,
    title: note.title.slice(0, 120),
    preview: stripMd(note.content).slice(0, 220),
    fullContent: note.content,
    status: note.status,
    sharedAt: Date.now(),
  };
}

/** Server-side: build a verified GradeShareCard by fetching fresh from SchoolSoft */
async function buildGradeCard(
  assignmentId: string,
  cookieString: string,
  school: string
): Promise<ShareCard | null> {
  try {
    const api = createSchoolsoftClient(school);
    const BASE = "/rest-api/student/ps";

    const viewRaw = await api
      .get(`${BASE}/assignments/${assignmentId}/view`, {
        headers: { Cookie: cookieString },
        responseType: "json",
      })
      .then(r => r.data as Record<string, unknown>)
      .catch(() => null);
    if (!viewRaw) return null;

    const assessmentRaw = await api
      .get(`${BASE}/assignment/${assignmentId}/assessment`, {
        headers: { Cookie: cookieString },
        responseType: "json",
      })
      .then(r => r.data as Record<string, unknown>)
      .catch(() => null);

    // Infer grade using the same logic as the frontend
    const moments: { name: string; points: number; max: number }[] = [];
    const tabs: { assessedCriteria?: { level?: { value: number } }[] }[] = [];

    if (assessmentRaw) {
      const rawMoments = Array.isArray(assessmentRaw.assessmentPartialMoments)
        ? assessmentRaw.assessmentPartialMoments as Record<string, unknown>[]
        : [];
      for (const m of rawMoments) {
        if (typeof m.points === "number" && typeof m.max === "number") {
          moments.push({ name: String(m.name ?? ""), points: m.points, max: m.max });
        }
      }
      if (Array.isArray(assessmentRaw.assessedCriteriaTabs)) {
        for (const t of assessmentRaw.assessedCriteriaTabs as Record<string, unknown>[]) {
          if (Array.isArray(t.assessedCriteria)) {
            tabs.push({ assessedCriteria: t.assessedCriteria as { level?: { value: number } }[] });
          }
        }
      }
    }

    let grade = "—";
    let confidence: "confirmed" | "estimated" = "estimated";

    if (tabs.length > 0) {
      const allCriteria = tabs.flatMap(t => t.assessedCriteria ?? []);
      const levels = allCriteria.map(c => c.level?.value ?? 0).filter(v => v >= 7);
      if (levels.length > 0) {
        const minLevel = Math.min(...levels);
        const avgLevel = levels.reduce((s, v) => s + v, 0) / levels.length;
        const eff = minLevel * 0.65 + avgLevel * 0.35;
        grade = eff >= 10.5 ? "A" : eff >= 9.5 ? "B" : eff >= 8.5 ? "C" : eff >= 7.5 ? "D" : eff >= 7 ? "E" : "F";
      }
    } else if (moments.length > 0) {
      const totalMax = moments.reduce((s, m) => s + m.max, 0);
      if (totalMax > 0) {
        const totalPoints = moments.reduce((s, m) => s + m.points, 0);
        const pct = (totalPoints / totalMax) * 100;
        grade = pct >= 95 ? "A" : pct >= 85 ? "B" : pct >= 70 ? "C" : pct >= 50 ? "D" : pct >= 40 ? "E" : "F";
      }
    }

    const totalMax = moments.reduce((s, m) => s + m.max, 0);
    const totalPoints = moments.reduce((s, m) => s + m.points, 0);
    const totalPointsStr = totalMax > 0 ? `${totalPoints} / ${totalMax}` : null;

    return {
      type: "grade",
      assignmentId: Number(assignmentId),
      assignmentTitle: String(viewRaw.title ?? "").slice(0, 120),
      subjectName: String(viewRaw.subjectNames ?? "").slice(0, 80),
      assignmentType: String(viewRaw.type ?? "Assignment").slice(0, 40),
      grade,
      confidence,
      totalPoints: totalPointsStr,
      sharedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

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
// Body: { content?: string; replyTo?: ReplyTo; shareCard?: { type: "note"; noteId: string } | { type: "grade"; assignmentId: string } }
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

  let body: {
    content?: string;
    replyTo?: ReplyTo;
    shareCard?: { type: string; noteId?: string; assignmentId?: string };
  } = {};
  try { body = await req.json(); } catch { /* empty */ }

  // ── Share card (server-validated, client only provides IDs) ─────────────
  let verifiedShareCard: ShareCard | null = null;
  if (body.shareCard?.type === "note" && body.shareCard.noteId) {
    verifiedShareCard = await buildNoteCard(body.shareCard.noteId, username);
    if (!verifiedShareCard) {
      return NextResponse.json({ success: false, error: "Note not found or access denied." }, { status: 403 });
    }
  } else if (body.shareCard?.type === "grade" && body.shareCard.assignmentId) {
    verifiedShareCard = await buildGradeCard(String(body.shareCard.assignmentId), cookieString, school);
    if (!verifiedShareCard) {
      return NextResponse.json({ success: false, error: "Assignment not found." }, { status: 404 });
    }
  }

  const content = verifiedShareCard
    ? (verifiedShareCard.type === "note"
        ? `📎 Shared a note: ${(verifiedShareCard as import("@/app/api/lib/messagingDb").NoteShareCard).title}`
        : `📊 Shared a grade`)
    : (body.content ?? "").trim().slice(0, 2000);

  if (!content && !verifiedShareCard) {
    return NextResponse.json({ success: false, error: "Message is empty." }, { status: 400 });
  }

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

  const message = await createMessage(conversationId, username, senderDisplayName, content, replyTo, verifiedShareCard);
  trackMessageSent();
  return NextResponse.json({ success: true, message });
}

// PATCH /api/conversations/[conversationId]  – group management
// Body: { action: "rename" | "add_member" | "remove_member" | "transfer_admin", ... }
export async function PATCH(req: NextRequest, { params }: Params) {
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
  if (convo.type !== "group") {
    return NextResponse.json({ success: false, error: "Not a group conversation." }, { status: 400 });
  }

  let body: {
    action?: string;
    groupName?: string;
    groupDescription?: string;
    targetUsername?: string;
  } = {};
  try { body = await req.json(); } catch { /* empty */ }

  if (body.action === "rename") {
    const updated = await updateGroupInfo(conversationId, username, {
      groupName: body.groupName,
      groupDescription: body.groupDescription,
    });
    if (!updated) return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    return NextResponse.json({ success: true, conversation: updated });
  }

  if (body.action === "add_member") {
    const target = (body.targetUsername ?? "").trim();
    if (!target) return NextResponse.json({ success: false, error: "targetUsername required." }, { status: 400 });
    const profile = await getProfile(target);
    if (!profile) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    const displayName =
      profile.displayName || `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || target;
    const updated = await addGroupMember(conversationId, username, target, displayName);
    if (!updated) return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    return NextResponse.json({ success: true, conversation: updated });
  }

  if (body.action === "remove_member" || body.action === "leave") {
    const target = body.action === "leave" ? username : (body.targetUsername ?? "").trim();
    if (!target) return NextResponse.json({ success: false, error: "targetUsername required." }, { status: 400 });
    const updated = await removeGroupMember(conversationId, username, target);
    if (!updated) return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    return NextResponse.json({ success: true, conversation: updated });
  }

  if (body.action === "transfer_admin") {
    const target = (body.targetUsername ?? "").trim();
    if (!target) return NextResponse.json({ success: false, error: "targetUsername required." }, { status: 400 });
    const updated = await transferGroupAdmin(conversationId, username, target);
    if (!updated) return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    return NextResponse.json({ success: true, conversation: updated });
  }

  return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
}
