import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = "eApp";

/* -------------------------------------------------------------
   POST /api/mobile/refresh
   -------------------------------------------------------------
   Trades a SchoolSoft refresh token for a new access token and
   refresh token.

   Request body (JSON):
     {
       refreshToken: string  SchoolSoft refresh token
       school?:      string  school slug (default "engelska")
                               or X-School header
     }

   Response (200): raw SchoolSoft token response, e.g.
     {
       access_token:  string,
       refresh_token: string,
       type:          "Bearer",
       expires:       900
     }
------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  let body: { refreshToken?: string; school?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { refreshToken } = body;
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: "refreshToken is required." }, { status: 400 });
  }

  const school = (body.school ?? req.headers.get("x-school") ?? "engelska").trim();

  const refreshUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/token` +
    `?clientId=${encodeURIComponent(CLIENT_ID)}` +
    `&grantType=refresh_token` +
    `&refreshToken=${encodeURIComponent(refreshToken)}`;

  try {
    const res = await fetch(refreshUrl, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    const text = await res.text();

    if (res.status !== 200) {
      console.warn(`[mobile/refresh] SchoolSoft returned ${res.status}`, text);
      return NextResponse.json(
        { success: false, error: "Refresh failed. The refresh token may have expired." },
        { status: 401 }
      );
    }

    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { access_token: text }; }

    return NextResponse.json({ success: true, ...(data as object) });
  } catch (err) {
    console.error("[mobile/refresh] error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not reach SchoolSoft. Try again later." },
      { status: 502 }
    );
  }
}
