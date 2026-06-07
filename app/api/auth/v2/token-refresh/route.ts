import { NextRequest, NextResponse } from "next/server";
import {
  applyAuthV2Cookies,
  AuthV2Error,
  refreshAuthV2Session,
  syncPasskeyRefreshToken,
} from "@/app/api/auth/v2/lib";

/**
 * POST /api/auth/v2/token-refresh
 *
 * Uses the stored SchoolSoft refresh token to:
 *  1. Obtain a new SchoolSoft access token.
 *  2. Re-derive a fresh JSESSIONID session via the eva-apps endpoint.
 *  3. Overwrite all session cookies so the user continues seamlessly.
 *
 * Called automatically by the client when the session approaches expiry
 * (the `ssp_ss_token_expires` cookie holds the Unix timestamp).
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("ssp_ss_refresh_token")?.value;
  const school       = req.cookies.get("ssp_school")?.value ?? "engelska";
  const orgid        = req.cookies.get("ssp_ss_orgid")?.value ?? "18";
  const username     = req.cookies.get("ssp_username")?.value ?? "";

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: "No refresh token available. Please log in again." },
      { status: 401 }
    );
  }

  try {
    const session = await refreshAuthV2Session({
      school,
      refreshToken,
      orgid,
      usernameHint: username,
      requireBrowserSession: false,
    });

    const res = NextResponse.json({ success: true, expiresAt: session.ssTokenExpiresAt });
    applyAuthV2Cookies(res, session);
    await syncPasskeyRefreshToken(session.username, session.school, session.refreshToken);
    return res;
  } catch (error) {
    if (error instanceof AuthV2Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("[auth/v2/token-refresh] error:", (error as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not refresh the SchoolSoft session." },
      { status: 500 }
    );
  }
}
