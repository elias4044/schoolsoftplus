import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { fetchSchoolsoftSession } from "@/app/api/lib/mobileAuth";
import { makeUserHandle, getPasskeyUser, updatePasskeyToken } from "@/app/api/lib/passkeyDb";
import { encrypt } from "@/app/api/lib/serverCrypto";

const CLIENT_ID = "eApp";

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

  /*  Step 1: Refresh the SchoolSoft access token  */
  const refreshUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/token` +
    `?clientId=${encodeURIComponent(CLIENT_ID)}` +
    `&grantType=refresh_token` +
    `&refreshToken=${encodeURIComponent(refreshToken)}`;

  let ssToken: string;
  let newRefreshToken: string | undefined;
  let expiresIn = 900;

  try {
    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    if (refreshRes.status !== 200) {
      const text = await refreshRes.text().catch(() => "");
      console.warn(`[auth/v2/token-refresh] refresh failed (${refreshRes.status}):`, text);
      return NextResponse.json(
        { success: false, error: "Refresh token expired. Please log in again." },
        { status: 401 }
      );
    }

    const data = await refreshRes.json() as Record<string, unknown>;
    ssToken        = data.access_token  as string;
    newRefreshToken = data.refresh_token as string | undefined;
    expiresIn       = typeof data.expires === "number" ? data.expires : 900;

    if (!ssToken) {
      return NextResponse.json(
        { success: false, error: "No access token in refresh response." },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error("[auth/v2/token-refresh] network error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not reach SchoolSoft. Try again later." },
      { status: 502 }
    );
  }

  /*  Step 2: Re-derive JSESSIONID via eva-apps  */
  const redirectUrl = `https://sms.schoolsoft.se/${school}/react/#/student/subjectrooms`;
  const sessionUrl  = `https://sms.schoolsoft.se/${encodeURIComponent(school)}/eva-apps/auth/login/student`;

  const sessionInfo = await fetchSchoolsoftSession(school, ssToken);
  const userId = sessionInfo?.userId?.toString() ?? "";
  const canonicalUsername = sessionInfo?.username ? sessionInfo.username.toLowerCase() : (username ?? "").toLowerCase();

  let jsessionid = "";
  let hash       = "";
  let usertype   = "1";

  try {
    const sessionRes = await axios.get(sessionUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "nyEva",
        "X-Requested-With": "com.schoolsoft.eapp.android",
        token:       ssToken,
        orgid,
        redirecturl: redirectUrl,
        language:    "sw",
        theme:       "dark",
        useros:      "android",
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie = sessionRes.headers["set-cookie"];
    const rawCookies: string[] = Array.isArray(setCookie) ? setCookie
      : setCookie ? [setCookie] : [];

    const extractValue = (raw: string) => raw.split(";")[0].split("=").slice(1).join("=");
    const cookieMap: Record<string, string> = {};
    for (const c of rawCookies) {
      const name = c.split("=")[0].trim();
      if (name) cookieMap[name] = extractValue(c);
    }

    jsessionid = cookieMap["JSESSIONID"] ?? "";
    hash       = cookieMap["hash"]       ?? "";
    usertype   = cookieMap["usertype"]   ?? "1";
  } catch (err) {
    console.error("[auth/v2/token-refresh] eva-apps error:", (err as Error).message);
  }

  /*  Step 3: Write refreshed cookies  */
  const ssTokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const res = NextResponse.json({ success: true, expiresAt: ssTokenExpiresAt });

  const sessionCookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };

  if (jsessionid && hash) {
    res.cookies.set("ssp_jsessionid", jsessionid, sessionCookieOpts);
    res.cookies.set("ssp_hash",       hash,       sessionCookieOpts);
    res.cookies.set("ssp_usertype",   usertype,   sessionCookieOpts);
  }
  res.cookies.set("ssp_school",   school,   { ...sessionCookieOpts, httpOnly: false });
  res.cookies.set("ssp_username", canonicalUsername, { ...sessionCookieOpts, httpOnly: false });

  res.cookies.set("ssp_ss_token",         ssToken,                  { ...sessionCookieOpts, maxAge: 60 * 60 * 24 * 30 });
  res.cookies.set("ssp_ss_token_expires", String(ssTokenExpiresAt), { ...sessionCookieOpts, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  if (newRefreshToken) {
    res.cookies.set("ssp_ss_refresh_token", newRefreshToken, { ...sessionCookieOpts, maxAge: 60 * 60 * 24 * 30 });
  }

  // Keep the passkey store in sync: if this user has a passkey record,
  // update it with the latest refresh token so future passkey logins work.
  const tokenToStore = newRefreshToken ?? refreshToken;
  if (tokenToStore && canonicalUsername && school) {
    const userHandle = makeUserHandle(canonicalUsername, school);
    getPasskeyUser(userHandle)
      .then(record => {
        if (!record) return;
        const { ciphertext, iv } = encrypt(tokenToStore);
        return updatePasskeyToken(userHandle, ciphertext, iv);
      })
      .catch(err =>
        console.error("[auth/v2/token-refresh] passkey token sync error:", (err as Error).message)
      );
  }

  return res;
}
