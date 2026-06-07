import { NextRequest, NextResponse } from "next/server";
import {
  applyAuthV2Cookies,
  AuthV2Error,
  recordAuthV2Login,
  refreshAuthV2Session,
  syncPasskeyRefreshToken,
} from "@/app/api/auth/v2/lib";
import { trackLoginEvent } from "@/app/api/lib/statsHelper";

export async function POST(req: NextRequest) {
  let body: { school?: string; refreshToken?: string; orgid?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const school = body.school?.trim() ?? "";
  const refreshToken = body.refreshToken?.trim() ?? "";
  const orgid = body.orgid?.trim() || "18";

  if (!school || !refreshToken) {
    return NextResponse.json(
      { success: false, error: "School and refresh token are required." },
      { status: 400 }
    );
  }

  try {
    const session = await refreshAuthV2Session({
      school,
      refreshToken,
      orgid,
      requireBrowserSession: true,
    });

    await recordAuthV2Login(session.username);
    trackLoginEvent(session.school);
    await syncPasskeyRefreshToken(session.username, session.school, session.refreshToken);

    const res = NextResponse.json({
      success: true,
      username: session.username,
      expiresAt: session.ssTokenExpiresAt,
    });

    applyAuthV2Cookies(res, session);
    return res;
  } catch (error) {
    if (error instanceof AuthV2Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("[auth/v2/refresh-token-login] error:", (error as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not complete refresh token login." },
      { status: 500 }
    );
  }
}
