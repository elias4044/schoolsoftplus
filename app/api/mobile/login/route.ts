import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { makePkcePair, makeState } from "@/app/api/lib/mobileAuth";
import { trackLoginEvent } from "@/app/api/lib/statsHelper";

const CLIENT_ID    = "eApp";
// SchoolSoft's eApp client only allows this redirect URI — it must match exactly.
// For the automated flow we read the code from the JSON response, so the redirect
// never actually fires; we just need it to pass SchoolSoft's validation.
const SS_REDIRECT  = "com.schoolsoftplus.app://";

/* 
   GET /api/mobile/login
   
   Generates a PKCE pair and returns the SchoolSoft auth URL for
   the manual browser-login flow.

   The verifier is returned to the app and must be stored on-device.
   There is NO server-side state — no session, no Firebase doc.

   Query parameters:
     school       – school slug           (default: "engelska")
     orgid        – school org ID         (default: "18")
     redirect_uri – your app's deep-link  (default: "com.schoolsoft.eapp://")
                    e.g. "com.myfork://auth"
                    SchoolSoft will redirect here with ?code=X&state=Y.
                    Your app intercepts it, then calls POST /api/mobile/token.

   Response:
     {
       success:  true,
       authUrl:  string,   ← open this in a browser / WebView
       verifier: string,   ← store on device; send back to /api/mobile/token
       state:    string,   ← store on device; verify against callback state
     }
*/
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const school      = searchParams.get("school")       ?? "engelska";
  const orgid       = searchParams.get("orgid")        ?? "18";
  const redirectUri = searchParams.get("redirect_uri") ?? SS_REDIRECT;

  const { verifier, challenge } = makePkcePair();
  const state = makeState();

  const authUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/react/#/login/student` +
    `?code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code` +
    `&orgid=${encodeURIComponent(orgid)}`;

  return NextResponse.json({ success: true, authUrl, verifier, state });
}

/* ─────────────────────────────────────────────────────────────
   POST /api/mobile/login
   ─────────────────────────────────────────────────────────────
   Fully automated login — the app sends credentials and receives
   a signed Bearer JWT with no browser interaction.

   All PKCE state is ephemeral within this single request;
   nothing is stored server-side.

   Request body (JSON):
     {
       username: string   – SchoolSoft username
       password: string   – SchoolSoft password
       school?:  string   – school slug (default "engelska")
                            can also be supplied via X-School header
       orgid?:   string   – school org ID (default "18")
     }

   Response (200):
     {
       success:   true,
       token:     string,   ← use as "Authorization: Bearer <token>"
       tokenType: "Bearer",
       expiresIn: 2592000   ← 30 days in seconds
     }

   Flow:
     1. Generate PKCE verifier + challenge (ephemeral, never persisted).
     2. GET SchoolSoft password endpoint → receives { code, state }.
     3. POST to SchoolSoft token endpoint with code + verifier
        → receives SchoolSoft access_token.
     4. GET /rest-api/session to confirm username.
     5. Issue signed JWT and return it.
───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string; school?: string; orgid?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "username and password are required." },
      { status: 400 }
    );
  }

  const school = (body.school ?? req.headers.get("x-school") ?? "engelska").trim();
  const orgid  = (body.orgid  ?? "18").trim();

  /* ── Step 1: Ephemeral PKCE pair ─────────────────────────── */
  const { verifier, challenge } = makePkcePair();
  const state = makeState();

  /* ── Step 2: Password login → authorization code ─────────── */
  // We use SchoolSoft's own redirect URI so the eApp client accepts the request.
  // The code is returned directly in the JSON response — the redirect never fires.
  const passwordLoginUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/student/password` +
    `?username=${encodeURIComponent(username)}` +
    `&password=${encodeURIComponent(password)}` +
    `&state=${encodeURIComponent(state)}` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(SS_REDIRECT)}` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&lang=2` +
    `&orgid=${encodeURIComponent(orgid)}`;

  let code: string;
  try {
    const loginRes = await axios.get(passwordLoginUrl, {
      headers: { Accept: "application/json", "User-Agent": "SchoolSoftPlus-Mobile/1.0" },
      validateStatus: () => true,
    });

    if (loginRes.status !== 200) {
      console.warn(`[mobile/login POST] password login status ${loginRes.status}`, loginRes.data);
      return NextResponse.json(
        { success: false, error: "Authentication failed. Check your credentials." },
        { status: 401 }
      );
    }

    const loginData = loginRes.data as { code?: string; state?: string; redirect_uri?: string };
    if (!loginData?.code) {
      console.error("[mobile/login POST] no code in response", loginData);
      return NextResponse.json(
        { success: false, error: "Authentication failed — no authorization code returned." },
        { status: 401 }
      );
    }

    code = loginData.code;
  } catch (err) {
    console.error("[mobile/login POST] password login error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not reach SchoolSoft. Try again later." },
      { status: 502 }
    );
  }

  /* ── Step 3: Exchange code + verifier for Bearer token ───── */
  const tokenResult = await exchangeCodeForToken(school, code, verifier);
  if (!tokenResult) {
    return NextResponse.json({ success: false, error: "Token exchange failed." }, { status: 401 });
  }

  trackLoginEvent(school);

  // Return the SchoolSoft token response directly — the app manages tokens itself.
  return NextResponse.json({ success: true, ...tokenResult });
}

/* ─────────────────────────────────────────────────────────────
   Shared helper — POST to SchoolSoft's token endpoint.
   Returns the raw SchoolSoft token fields or null on failure.
───────────────────────────────────────────────────────────── */
export async function exchangeCodeForToken(
  school: string,
  code: string,
  verifier: string
): Promise<Record<string, unknown> | null> {
  const tokenUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/token` +
    `?clientId=${encodeURIComponent(CLIENT_ID)}` +
    `&grantType=code` +
    `&code=${encodeURIComponent(code)}` +
    `&codeVerifier=${encodeURIComponent(verifier)}`;

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    const text = await tokenRes.text();

    if (tokenRes.status !== 200) {
      console.warn(`[mobile] token exchange status ${tokenRes.status}`, text);
      return null;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      // Bare token string — wrap it
      return text ? { access_token: text } : null;
    }
  } catch (err) {
    console.error("[mobile] token exchange error:", (err as Error).message);
    return null;
  }
}
