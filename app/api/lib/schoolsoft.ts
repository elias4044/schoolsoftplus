import { NextRequest } from "next/server";
import axios from "axios";
import { fetchSchoolsoftSession } from "./mobileAuth";

const DEFAULT_USER_AGENT =
  "Schoolsoft+/1.0 (https://ssp.elias4044.com; +)";

/**
 * Creates a configured Axios instance that targets a specific school's
 * SchoolSoft subdirectory. The `school` param maps to the path segment
 * that replaces "engelska" (or whatever the school's slug is).
 *
 * @example
 *   createSchoolsoftClient("engelska")
 *   // baseURL → https://sms.schoolsoft.se/engelska
 */
export function createSchoolsoftClient(school: string) {
  const baseURL = `https://sms.schoolsoft.se/${school}`;
  return axios.create({
    baseURL,
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Referer: `${baseURL}/`,
      Origin: "https://sms.schoolsoft.se",
    },
  });
}

/**
 * Resolves the school slug from the request headers or cookies.
 * Falls back to "engelska" if neither is provided.
 */
export function getSchool(req: NextRequest | Headers): string {
  if (req instanceof NextRequest) {
    return req.headers.get("x-school") ?? req.cookies.get("ssp_school")?.value ?? "engelska";
  }
  return req.get("x-school") ?? "engelska";
}

/**
 * Reads the SchoolSoft session cookies that were set by our login endpoint
 * and returns the cookie string to forward to SchoolSoft, plus metadata.
 *
 * Returns null if the user is not logged in (missing ssp_jsessionid cookie).
 */
export function getSessionCookies(req: NextRequest): {
  cookieString: string;
  school: string;
  username: string;
} | null {
  const jsessionid = req.cookies.get("ssp_jsessionid")?.value; // raw value, e.g. "F92FC4EC..."
  const hash       = req.cookies.get("ssp_hash")?.value;       // raw value, e.g. "d85914fa..."
  const usertype   = req.cookies.get("ssp_usertype")?.value;   // raw value, e.g. "1"
  const school     = req.cookies.get("ssp_school")?.value ?? "engelska";
  const username   = (req.cookies.get("ssp_username")?.value ?? "").toLowerCase();

  if (!jsessionid) return null;

  // Reconstruct the Cookie header SchoolSoft expects: "JSESSIONID=xxx; hash=yyy; usertype=zzz"
  const cookieString = [
    `JSESSIONID=${jsessionid}`,
    hash      ? `hash=${hash}`           : null,
    usertype  ? `usertype=${usertype}`   : null,
  ].filter(Boolean).join("; ");

  return { cookieString, school, username };
}

/** Decodes SchoolSoft's ISO-8859-1 HTML responses into a UTF-8 string. */
export function decodeHtmlResponse(buffer: Buffer | ArrayBuffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const iconv = require("iconv-lite") as typeof import("iconv-lite");
  const buf = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
  return iconv.decode(buf, "ISO-8859-1");
}

/**
 * AuthV2-aware session resolver.
 *
 * Resolves a valid SchoolSoft session for both classic (JSESSIONID) and
 * AuthV2 (Bearer token) logins:
 *
 * 1. If a JSESSIONID cookie exists → return it immediately (no extra
 *    network call — the caller is responsible for calling authUser if they
 *    need to verify liveness).
 * 2. If the JSESSIONID is missing **and** the user has AuthV2 tokens →
 *    trade the stored Bearer token for a fresh JSESSIONID via SchoolSoft's
 *    eva-apps endpoint.  If the Bearer token itself is expired the refresh
 *    token is used first.
 * 3. Returns null when no valid session can be established.
 *
 * NOTE: When a refreshed session is returned, `cookieUpdates` will be
 * non-null.  Callers that can write response cookies should apply them so
 * subsequent requests don't need to repeat the exchange.
 */
export async function requireSession(req: NextRequest): Promise<{
  cookieString: string;
  school: string;
  username: string;
  cookieUpdates: {
    jsessionid: string;
    hash: string;
    usertype: string;
    ssToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    username?: string;
  } | null;
} | null> {
  /* ── Fast path: classic JSESSIONID ─────────────────────── */
  const sess = getSessionCookies(req);
  if (sess) {
    /* If username cookie was empty, fetch it from SchoolSoft now */
    if (!sess.username) {
      try {
        const api = createSchoolsoftClient(sess.school);
        const { data, status } = await api.get("/rest-api/session", {
          headers: { Cookie: sess.cookieString },
          responseType: "json",
          validateStatus: () => true,
        });
        if (status === 200 && data?.user?.userName) {
          const resolvedUsername = (data.user.userName as string).toLowerCase();
          return {
            ...sess,
            username: resolvedUsername,
            cookieUpdates: {
              jsessionid: req.cookies.get("ssp_jsessionid")?.value ?? "",
              hash: req.cookies.get("ssp_hash")?.value ?? "",
              usertype: req.cookies.get("ssp_usertype")?.value ?? "1",
              username: resolvedUsername,
            },
          };
        }
      } catch { /* keep empty username rather than failing */ }
    }
    return { ...sess, cookieUpdates: null };
  }

  /* ── Slow path: AuthV2 Bearer → fresh JSESSIONID ──────── */
  const authType = req.cookies.get("ssp_auth_type")?.value;
  if (authType !== "authv2") return null;

  const ssToken      = req.cookies.get("ssp_ss_token")?.value;
  const refreshToken = req.cookies.get("ssp_ss_refresh_token")?.value;
  const school       = req.cookies.get("ssp_school")?.value ?? "engelska";
  const orgid        = req.cookies.get("ssp_ss_orgid")?.value ?? "18";
  const username     = (req.cookies.get("ssp_username")?.value ?? "").toLowerCase();

  if (!ssToken && !refreshToken) return null;

  const CLIENT_ID = "eApp";
  let activeToken  = ssToken ?? "";
  let newRefresh: string | undefined;
  let expiresAt: number | undefined;
  let refreshedAccessToken = false;

  /* Try to refresh the access token first if we have a refresh token */
  if (refreshToken) {
    try {
      const refreshUrl =
        `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/token` +
        `?clientId=${encodeURIComponent(CLIENT_ID)}` +
        `&grantType=refresh_token` +
        `&refreshToken=${encodeURIComponent(refreshToken)}`;
      const r = await fetch(refreshUrl, { method: "POST", headers: { accept: "application/json" } });
      if (r.status === 200) {
        const d = await r.json() as Record<string, unknown>;
        if (d.access_token) {
          activeToken = d.access_token as string;
          newRefresh  = d.refresh_token as string | undefined;
          const ei    = typeof d.expires === "number" ? d.expires : 900;
          expiresAt   = Math.floor(Date.now() / 1000) + ei;
          refreshedAccessToken = true;
        }
      }
    } catch { /* fall through with existing token */ }
  }

  if (!activeToken) return null;

  /* Trade the Bearer token for a JSESSIONID via eva-apps */
  const redirectUrl = `https://sms.schoolsoft.se/${school}/react/#/student/subjectrooms`;
  const sessionUrl  = `https://sms.schoolsoft.se/${encodeURIComponent(school)}/eva-apps/auth/login/student`;

  let jsessionid = "";
  let hash       = "";
  let usertype   = "1";

  try {
    const sessionRes = await axios.get(sessionUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "nyEva",
        "X-Requested-With": "com.schoolsoft.eapp.android",
        token: activeToken,
        orgid,
        redirecturl: redirectUrl,
        language: "sw",
        theme: "dark",
        useros: "android",
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie  = sessionRes.headers["set-cookie"];
    const rawCookies: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const extractVal = (raw: string) => raw.split(";")[0].split("=").slice(1).join("=");
    const cookieMap: Record<string, string> = {};
    for (const c of rawCookies) {
      const name = c.split("=")[0].trim();
      if (name) cookieMap[name] = extractVal(c);
    }

    jsessionid = cookieMap["JSESSIONID"] ?? "";
    hash       = cookieMap["hash"]       ?? "";
    usertype   = cookieMap["usertype"]   ?? "1";
  } catch (err) {
    console.error("[requireSession] eva-apps error:", (err as Error).message);
    return null;
  }

  if (!jsessionid) return null;

  const cookieString = [
    `JSESSIONID=${jsessionid}`,
    hash     ? `hash=${hash}`         : null,
    usertype ? `usertype=${usertype}` : null,
  ].filter(Boolean).join("; ");

  /* If username cookie was empty, resolve it via the Bearer token */
  let resolvedUsername = username;
  if (!resolvedUsername) {
    const ssInfo = await fetchSchoolsoftSession(school, activeToken);
    if (ssInfo?.username) resolvedUsername = ssInfo.username;
  }

  return {
    cookieString,
    school,
    username: resolvedUsername,
    cookieUpdates: {
      jsessionid,
      hash,
      usertype,
      ssToken:      refreshedAccessToken ? activeToken : undefined,
      refreshToken: newRefresh,
      expiresAt:    refreshedAccessToken ? expiresAt : undefined,
      username:     resolvedUsername || undefined,
    },
  };
}

/**
 * Applies the refreshed AuthV2 cookies returned by `requireSession` to a
 * NextResponse.  Safe to call with a null `cookieUpdates` (no-op).
 */
export function applySessionCookieUpdates(
  res: import("next/server").NextResponse,
  cookieUpdates: {
    jsessionid: string;
    hash: string;
    usertype: string;
    ssToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    username?: string;
  } | null
) {
  if (!cookieUpdates) return;
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
  res.cookies.set("ssp_jsessionid", cookieUpdates.jsessionid, base);
  res.cookies.set("ssp_hash",       cookieUpdates.hash,       base);
  res.cookies.set("ssp_usertype",   cookieUpdates.usertype,   base);
  if (cookieUpdates.username) {
    res.cookies.set("ssp_username", cookieUpdates.username, { ...base, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  }
  if (cookieUpdates.ssToken) {
    res.cookies.set("ssp_ss_token",         cookieUpdates.ssToken,           { ...base, maxAge: 60 * 60 * 24 * 30 });
    res.cookies.set("ssp_ss_token_expires",  String(cookieUpdates.expiresAt ?? 0), { ...base, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  }
  if (cookieUpdates.refreshToken) {
    res.cookies.set("ssp_ss_refresh_token", cookieUpdates.refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
  }
}
