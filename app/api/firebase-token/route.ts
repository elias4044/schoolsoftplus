import { NextRequest, NextResponse } from "next/server";
import { requireSession, applySessionCookieUpdates } from "@/app/api/lib/schoolsoft";
import { fetchSchoolsoftSession } from "@/app/api/lib/mobileAuth";
import { authUser } from "@/app/api/lib/auth";
import admin from "firebase-admin";
import "@/app/api/lib/firebaseAdmin"; // ensure admin is initialised

// GET /api/firebase-token
// Returns a short-lived Firebase custom auth token for the authenticated user.
// Works with classic session-cookie auth and AuthV2 Bearer-token auth.
// For AuthV2: tries JSESSIONID first (fast), falls back to Bearer token verification
// if JSESSIONID is missing (e.g. eva-apps failed during callback) or username is empty.
export async function GET(req: NextRequest) {
  // Try JSESSIONID-based session first (works for both classic and AuthV2 post-callback)
  const sess = await requireSession(req);
  let username = sess?.username ?? "";

  // If the incoming request carried a JSESSIONID cookie (classic flow),
  // validate it server-side before minting a Firebase token. An expired
  // or stale JSESSIONID should not be able to obtain a token.
  const incomingHasJsession = !!req.cookies.get("ssp_jsessionid")?.value;
  if (sess && incomingHasJsession) {
    try {
      const valid = await authUser(sess.cookieString, sess.school);
      if (!valid) {
        username = ""; // force fallback to AuthV2 bearer verification if available
      }
    } catch (err) {
      console.error("[firebase-token] authUser check failed:", (err as Error).message);
      username = "";
    }
  }

  // AuthV2 fallback: if requireSession failed OR returned an empty username,
  // verify directly via the stored Bearer token (doesn't need JSESSIONID).
  if ((!sess || !username) && req.cookies.get("ssp_auth_type")?.value === "authv2") {
    const ssToken = req.cookies.get("ssp_ss_token")?.value;
    const school  = req.cookies.get("ssp_school")?.value ?? "engelska";

    if (ssToken) {
      const sessionInfo = await fetchSchoolsoftSession(school, ssToken);
      if (sessionInfo?.username) {
        username = sessionInfo.username.toLowerCase();
      }
    }
  }

  if (!sess && !username) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  if (!username) {
    const resErr = NextResponse.json({ success: false, error: "Could not determine username." }, { status: 400 });
    applySessionCookieUpdates(resErr, sess?.cookieUpdates ?? null);
    return resErr;
  }

  try {
    // uid must be a non-empty string ≤ 128 chars — SchoolSoft usernames qualify.
    const token = await admin.auth().createCustomToken(username);
    const res = NextResponse.json({ success: true, token });
    // Persist any refreshed AuthV2 cookies so subsequent requests don't re-derive
    applySessionCookieUpdates(res, sess?.cookieUpdates ?? null);
    return res;
  } catch (err) {
    console.error("[firebase-token] createCustomToken failed:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Failed to create auth token." },
      { status: 500 }
    );
  }
}


