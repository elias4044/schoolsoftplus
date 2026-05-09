import { NextRequest, NextResponse } from "next/server";
import { makePkcePair, makeState } from "@/app/api/lib/mobileAuth";

const CLIENT_ID = "eApp";

/**
 * GET /api/auth/v2/initiate?school=engelska&orgid=18
 *
 * Initiates the AuthV2 (OAuth 2.0 PKCE) browser-based login flow.
 *
 * 1. Generates a fresh PKCE verifier + challenge pair and a CSRF state token.
 * 2. Stores { verifier, state, school } in a short-lived httpOnly cookie.
 * 3. Redirects the browser to SchoolSoft's student login page with all
 *    required OAuth parameters pre-filled.
 *
 * SchoolSoft will redirect back to /api/auth/v2/callback after the user
 * enters their credentials.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const school = (searchParams.get("school") ?? "engelska").trim();
  const orgid  = (searchParams.get("orgid")  ?? "18").trim();

  /*  Determine callback URL  */
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`;
  const redirectUri = `${appUrl}/api/auth/v2/callback`;

  /*  Generate PKCE + state  */
  const { verifier, challenge } = makePkcePair();
  const state = makeState();

  /*  Build SchoolSoft OAuth URL  */
  const authUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/react/#/login/student` +
    `?code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code` +
    `&orgid=${encodeURIComponent(orgid)}`;

  /*  Persist PKCE verifier + state in a short-lived cookie  */
  const pkcePayload = JSON.stringify({ verifier, state, school, orgid, redirectUri });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("ssp_v2_pkce", pkcePayload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — enough to complete the login
  });

  return res;
}
