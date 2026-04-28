import { NextRequest, NextResponse } from "next/server";import axios from "axios";

/* -------------------------------------------------------------
   GET /api/mobile/session
   -------------------------------------------------------------
*/
export async function GET(req: NextRequest) {
  const ssToken = req.headers.get("x-ss-token");
  if (!ssToken) {
    return NextResponse.json({ success: false, error: "x-ss-token header is required." }, { status: 400 });
  }

  const school      = req.headers.get("x-school")       ?? "engelska";
  const userId      = req.headers.get("x-userid");
  const username    = req.headers.get("x-username")     ?? "";
  const orgid       = req.headers.get("x-orgid")        ?? "18";
  const language    = req.headers.get("x-language")     ?? "sw";
  const theme       = req.headers.get("x-theme")        ?? "dark";
  const useros      = req.headers.get("x-useros")       ?? "android";
  const redirectUrl = req.headers.get("x-redirect-url") ??
    `https://sms.schoolsoft.se/${school}/react/#/student/subjectrooms`;

  const sessionUrl = `https://sms.schoolsoft.se/${encodeURIComponent(school)}/eva-apps/auth/login/student`;

  let rawCookies: string[];
  try {
    const res = await axios.get(sessionUrl, {
      headers: {
        "Accept":           "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":       "nyEva",
        "X-Requested-With": "com.schoolsoft.eapp.android",
        "token":            ssToken,
        "orgid":            orgid,
        "redirecturl":      redirectUrl,
        "language":         language,
        "theme":            theme,
        "useros":           useros,
        ...(userId ? { "userid": userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie = res.headers["set-cookie"];
    rawCookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];

    if (rawCookies.length === 0) {
      console.warn(`[mobile/session] no cookies in response (status ${res.status})`, res.headers);
      return NextResponse.json(
        { success: false, error: "SchoolSoft did not return any session cookies." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[mobile/session] error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not reach SchoolSoft. Try again later." },
      { status: 502 }
    );
  }

  /* -- Parse Set-Cookie headers ------------------------------ */
  const extractValue = (raw: string) => raw.split(";")[0].split("=").slice(1).join("=");
  const cookieMap: Record<string, string> = {};
  for (const c of rawCookies) {
    const name = c.split("=")[0].trim();
    if (name) cookieMap[name] = extractValue(c);
  }

  const jsessionid = cookieMap["JSESSIONID"] ?? "";
  const hash       = cookieMap["hash"]       ?? "";
  const usertype   = cookieMap["usertype"]   ?? "1";

  if (!jsessionid || !hash) {
    console.warn("[mobile/session] missing JSESSIONID or hash", cookieMap);
    return NextResponse.json(
      { success: false, error: "SchoolSoft did not return a valid session (missing JSESSIONID or hash)." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success:        true,
    school,
    username,
    ssp_jsessionid: jsessionid,
    ssp_hash:       hash,
    ssp_usertype:   usertype,
    cookieHeader:   `JSESSIONID=${jsessionid}; hash=${hash}; usertype=${usertype}`,
  });
}