import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import admin from "firebase-admin";
import "@/app/api/lib/firebaseAdmin"; // ensure admin is initialised

// GET /api/firebase-token
// Returns a short-lived Firebase custom auth token for the authenticated user.
// The client uses this to sign into Firebase so Firestore security rules can
// identify the caller via request.auth.uid (= SchoolSoft username).
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { cookieString, school, username } = sess;
  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  try {
    // uid must be a non-empty string ≤ 128 chars — SchoolSoft usernames qualify.
    const token = await admin.auth().createCustomToken(username);
    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error("[firebase-token]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Failed to create auth token." },
      { status: 500 }
    );
  }
}
