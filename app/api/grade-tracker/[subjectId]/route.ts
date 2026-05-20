import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import {
  getGradeTracker,
  getOrCreateGradeTracker,
  saveGradeTracker,
} from "@/app/api/lib/gradeTrackerDb";
import { mergeScannedEntries, createSnapshot } from "@/lib/grades/analytics";
import type { GradeEntry, GradeTrackerDoc } from "@/lib/grades/types";

async function authenticate(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

/** GET /api/grade-tracker/[subjectId] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjectId } = await params;
  const sid = Number(subjectId);
  if (!Number.isFinite(sid)) {
    return NextResponse.json({ error: "Invalid subject id" }, { status: 400 });
  }

  const tracker = await getGradeTracker(username, sid);
  return NextResponse.json({ success: true, tracker });
}

/** PUT /api/grade-tracker/[subjectId] — save tracker or merge scan results */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjectId } = await params;
  const sid = Number(subjectId);
  if (!Number.isFinite(sid)) {
    return NextResponse.json({ error: "Invalid subject id" }, { status: 400 });
  }

  let body: {
    subjectName?: string;
    subjectColor?: string;
    settings?: GradeTrackerDoc["settings"];
    entries?: GradeEntry[];
    scanned?: Parameters<typeof mergeScannedEntries>[1];
    addSnapshot?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let tracker = await getOrCreateGradeTracker(
    username,
    sid,
    body.subjectName ?? "Subject",
    body.subjectColor
  );

  if (body.subjectName) tracker.subjectName = body.subjectName;
  if (body.subjectColor) tracker.subjectColor = body.subjectColor;
  if (body.settings) tracker.settings = { ...tracker.settings, ...body.settings };

  if (body.scanned?.length) {
    tracker.entries = mergeScannedEntries(tracker.entries, body.scanned);
  } else if (body.entries) {
    tracker.entries = body.entries;
  }

  if (body.addSnapshot !== false && (body.scanned?.length || body.entries)) {
    const snap = createSnapshot(tracker.entries, tracker.settings);
    tracker.snapshots = [...tracker.snapshots, snap].slice(-50);
  }

  tracker = await saveGradeTracker(tracker);
  return NextResponse.json({ success: true, tracker });
}
