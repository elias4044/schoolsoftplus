import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { exchangeCodeForToken, fetchSchoolsoftSession } from "@/app/api/lib/mobileAuth";
import { db } from "@/app/api/lib/firebaseAdmin";
import { trackLoginEvent } from "@/app/api/lib/statsHelper";

/**
 * GET /api/auth/v2/callback?code=xxx&state=yyy
 *
 * OAuth 2.0 PKCE callback — SchoolSoft redirects here after the user logs in
 * via the SchoolSoft UI.
 *
 * Steps:
 *  1. Validate the `state` parameter against the PKCE cookie.
 *  2. Exchange `code` + `verifier` for a SchoolSoft access token (OAuth PKCE).
 *  3. Use the access token to acquire a JSESSIONID session via SchoolSoft's
 *     eva-apps endpoint — so the rest of the app's regular API routes work.
 *  4. Set the same session cookies as the password-based login flow.
 *  5. Additionally store the SS access + refresh tokens for auto-renewal.
 *  6. Track the login event in Firestore (same as the regular login).
 *  7. Redirect to /dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  /*  SchoolSoft returned an error  */
  if (error || !code) {
    const msg = encodeURIComponent(
      error === "access_denied"
        ? "Login was cancelled."
        : "SchoolSoft login failed. Please try again.",
    );
    return NextResponse.redirect(
      new URL(`/login?authv2_error=${msg}`, req.url),
    );
  }

  /*  Read & validate the PKCE cookie  */
  const rawPkce = req.cookies.get("ssp_v2_pkce")?.value;
  if (!rawPkce) {
    return NextResponse.redirect(
      new URL(
        "/login?authv2_error=" +
          encodeURIComponent("Session expired. Please try again."),
        req.url,
      ),
    );
  }

  let pkce: {
    verifier: string;
    state: string;
    school: string;
    orgid: string;
    redirectUri: string;
  };
  try {
    pkce = JSON.parse(rawPkce);
  } catch {
    return NextResponse.redirect(
      new URL(
        "/login?authv2_error=" +
          encodeURIComponent("Invalid session data. Please try again."),
        req.url,
      ),
    );
  }

  if (!state || pkce.state !== state) {
    return NextResponse.redirect(
      new URL(
        "/login?authv2_error=" +
          encodeURIComponent("State mismatch. Please try again."),
        req.url,
      ),
    );
  }

  const { verifier, school } = pkce;

  /*  Exchange code + verifier for SchoolSoft token  */
  const tokenResult = await exchangeCodeForToken(school, code, verifier);
  if (!tokenResult) {
    return NextResponse.redirect(
      new URL(
        "/login?authv2_error=" +
          encodeURIComponent("Token exchange failed. Please try again."),
        req.url,
      ),
    );
  }

  const ssToken = tokenResult.access_token as string | undefined;
  const refreshToken = tokenResult.refresh_token as string | undefined;
  const expiresIn =
    typeof tokenResult.expires === "number" ? tokenResult.expires : 900;

  if (!ssToken) {
    return NextResponse.redirect(
      new URL(
        "/login?authv2_error=" +
          encodeURIComponent("No access token returned. Please try again."),
        req.url,
      ),
    );
  }

  /*  Fetch canonical session info (username, userId, etc.)  */
  const sessionInfo = await fetchSchoolsoftSession(school, ssToken);
  const username = (sessionInfo?.username ?? "").toLowerCase(); 
  const userId = sessionInfo?.userId?.toString() ?? "";
  const orgid = pkce.orgid ?? "18";

  /*  Translate the Bearer token → SchoolSoft JSESSIONID  */
  // This replicates what /api/auth/session does for the mobile app.
  // SchoolSoft's eva-apps endpoint trades the Bearer token for browser
  // session cookies, making the token-based auth compatible with the
  // cookie-based SchoolSoft REST API that all dashboard routes use.
  const redirectUrl = `https://sms.schoolsoft.se/${school}/react/#/student/subjectrooms`;
  const sessionUrl = `https://sms.schoolsoft.se/${encodeURIComponent(school)}/eva-apps/auth/login/student`;

  let jsessionid = "";
  let hash = "";
  let usertype = "1";

  try {
    const sessionRes = await axios.get(sessionUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "nyEva",
        "X-Requested-With": "com.schoolsoft.eapp.android",
        token: ssToken,
        orgid,
        redirecturl: redirectUrl,
        language: "sw",
        theme: "dark",
        useros: "android",
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie = sessionRes.headers["set-cookie"];
    const rawCookies: string[] = Array.isArray(setCookie)
      ? setCookie
      : setCookie
        ? [setCookie]
        : [];

    const extractValue = (raw: string) =>
      raw.split(";")[0].split("=").slice(1).join("=");
    const cookieMap: Record<string, string> = {};
    for (const c of rawCookies) {
      const name = c.split("=")[0].trim();
      if (name) cookieMap[name] = extractValue(c);
    }

    jsessionid = cookieMap["JSESSIONID"] ?? "";
    hash = cookieMap["hash"] ?? "";
    usertype = cookieMap["usertype"] ?? "1";
  } catch (err) {
    console.error(
      "[auth/v2/callback] eva-apps session error:",
      (err as Error).message,
    );
    // Non-fatal: we still have the Bearer token; session cookies are optional.
    // The token-based refresh path will re-derive them when needed.
  }

  /*  Track login in Firestore  */
  const time = new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
  });

  try {
    const statsRef = db.collection("stats").doc("loginStats");
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(statsRef);

      type UserEntry = {
        username: string;
        first_login: string;
        last_login: string;
        login_count: number;
        auth_method: string;
        data: { goals: unknown[]; notes: unknown[] };
      };
      type StatsData = {
        total_logins: number;
        total_successful_logins: number;
        total_api_calls: number;
        unique_logins: number;
        failed_logins: number;
        users: UserEntry[];
      };

      const base: StatsData = {
        total_logins: 0,
        total_successful_logins: 0,
        total_api_calls: 0,
        unique_logins: 0,
        failed_logins: 0,
        users: [],
      };

      const data: StatsData = doc.exists
        ? { ...base, ...(doc.data() as StatsData) }
        : base;
      data.total_logins += 1;
      data.total_api_calls += 1;
      data.total_successful_logins += 1;

      if (username) {
        const idx = data.users.findIndex((u) => u.username === username);
        if (idx === -1) {
          data.unique_logins += 1;
          data.users.push({
            username,
            first_login: time,
            last_login: time,
            login_count: 1,
            auth_method: "authv2",
            data: { goals: [], notes: [] },
          });
        } else {
          data.users[idx].last_login = time;
          data.users[idx].login_count += 1;
          data.users[idx].auth_method = "authv2";
          data.users[idx].data ??= { goals: [], notes: [] };
        }
      }

      doc.exists ? tx.update(statsRef, data) : tx.set(statsRef, data);
    });
  } catch (err) {
    console.error(
      "[auth/v2/callback] Firestore error:",
      (err as Error).message,
    );
    // Non-fatal — don't block the user from logging in.
  }

  trackLoginEvent(school);

  /*  Set cookies & redirect  */
  const ssTokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const res = NextResponse.redirect(new URL("/dashboard", req.url));

  // Clear the ephemeral PKCE cookie
  res.cookies.set("ssp_v2_pkce", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  const sessionCookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };

  // Regular session cookies (same as password login) — allows all existing
  // dashboard API routes to work without modification.
  if (jsessionid && hash) {
    res.cookies.set("ssp_jsessionid", jsessionid, sessionCookieOpts);
    res.cookies.set("ssp_hash", hash, sessionCookieOpts);
    res.cookies.set("ssp_usertype", usertype, sessionCookieOpts);
  }
  res.cookies.set("ssp_school", school, {
    ...sessionCookieOpts,
    httpOnly: false,
  });
  res.cookies.set("ssp_username", username, {
    ...sessionCookieOpts,
    httpOnly: false,
  });

  // AuthV2-specific cookies — used for token refresh when the JSESSIONID expires.
  res.cookies.set("ssp_ss_token", ssToken, {
    ...sessionCookieOpts,
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("ssp_ss_token_expires", String(ssTokenExpiresAt), {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  if (refreshToken) {
    res.cookies.set("ssp_ss_refresh_token", refreshToken, {
      ...sessionCookieOpts,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  res.cookies.set("ssp_auth_type", "authv2", {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("ssp_ss_orgid", orgid, {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("ssp_userid", userId, {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
