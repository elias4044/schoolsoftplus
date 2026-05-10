import { NextRequest, NextResponse } from "next/server";
import { makePkcePair, makeState } from "@/app/api/lib/mobileAuth";

const CLIENT_ID = "eApp";

/**
 * GET /api/auth/v2/initiate/external?school=engelska&orgid=18
 *
 * Initiates the AuthV2 (OAuth 2.0 PKCE) browser-based login flow.
 *
 * Goes directly to external login (SAML login), basically the same as GET /api/auth/v2/initiate but sends directly to SAML login.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const school = (searchParams.get("school") ?? "engelska").trim();
    const orgid = (searchParams.get("orgid") ?? "18").trim();

    /*  Determine callback URL  */
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`;
    const redirectUri = `${appUrl}/api/auth/v2/callback`;

    /*  Generate PKCE + state  */
    const { verifier, challenge } = makePkcePair();
    const state = makeState();

    // Build relay state
    const relayStateParams = new URLSearchParams({
        state,
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        code_challenge: challenge,
        code_challenge_method: "S256",
        initiated: "true",
    });

    const relayState = `../react/#/login/student/external?${relayStateParams.toString()}`;

    /*  Build SchoolSoft OAuth URL  */
    const authUrl =
        `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/student/saml` +
        `?client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&lang=2` +
        `&RelayState=${encodeURIComponent(relayState)}`;

    /*  Persist PKCE verifier + state in a short-lived cookie  */
    const pkcePayload = JSON.stringify({ verifier, state, school, orgid, redirectUri });

    const res = NextResponse.redirect(authUrl);
    res.cookies.set("ssp_v2_pkce", pkcePayload, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10, // 10 minutes - enough to complete the login
    });

    return res;
}
